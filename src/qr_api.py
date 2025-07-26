from flask import Flask, jsonify, request
from flask_cors import CORS
import qrcode
import random
import string
import base64
from io import BytesIO
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Store valid QR codes with timestamps
valid_qr_codes = {}
attendance_records = []
QR_VALIDITY_SECONDS = 30

def generate_random_data(length=10):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def generate_qr_image(data):
    qr = qrcode.make(data)
    buffered = BytesIO()
    qr.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def cleanup_expired_qr_codes():
    """Remove expired QR codes from the valid_qr_codes dictionary"""
    current_time = time.time()
    expired_codes = [code for code, timestamp in valid_qr_codes.items() 
                    if current_time - timestamp > QR_VALIDITY_SECONDS]
    for code in expired_codes:
        del valid_qr_codes[code]

@app.route('/qr')
def get_qr():
    cleanup_expired_qr_codes()
    
    data = generate_random_data()
    image = generate_qr_image(data)
    
    # Store the QR code with current timestamp
    valid_qr_codes[data] = time.time()
    
    return jsonify({"data": data, "image": image})

@app.route('/validate', methods=['POST'])
def validate_qr():
    """Validate a QR code scanned by a student"""
    cleanup_expired_qr_codes()
    
    data = request.json
    qr_code = data.get('qr_code')
    student_id = data.get('student_id')
    student_name = data.get('student_name')
    
    if not qr_code or not student_id:
        return jsonify({
            'valid': False, 
            'message': 'QR code and student ID are required'
        }), 400
    
    # Check if student already marked attendance with this QR
    for record in attendance_records:
        if record['student_id'] == student_id and record['qr_code'] == qr_code:
            return jsonify({
                'valid': False,
                'message': 'You have already marked attendance'
            }), 400
    
    # Check if QR code is valid and not expired
    if qr_code in valid_qr_codes:
        current_time = time.time()
        qr_timestamp = valid_qr_codes[qr_code]
        
        if current_time - qr_timestamp <= QR_VALIDITY_SECONDS:
            # Mark attendance
            attendance_record = {
                'student_id': student_id,
                'student_name': student_name,
                'qr_code': qr_code,
                'timestamp': datetime.now().isoformat(),
                'status': 'present'
            }
            
            attendance_records.append(attendance_record)
            print(f"Attendance marked: {attendance_record}")
            
            return jsonify({
                'valid': True,
                'message': 'Attendance marked successfully!',
                'timestamp': attendance_record['timestamp']
            })
        else:
            # QR code expired
            del valid_qr_codes[qr_code]
            return jsonify({
                'valid': False,
                'message': 'QR code has expired'
            }), 400
    else:
        return jsonify({
            'valid': False,
            'message': 'Invalid or already used QR code'
        }), 400

@app.route('/download/excel')
def download_excel():
    """Return attendance data for download"""
    return jsonify({
        'attendance_records': attendance_records,
        'total_count': len(attendance_records)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
