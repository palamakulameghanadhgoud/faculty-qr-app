from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import qrcode
import random
import string
import base64
from io import BytesIO
import time
from datetime import datetime
import pandas as pd
import os
import threading

app = Flask(__name__)

# More permissive CORS for development and tunnels
CORS(app, 
     origins=["*"],  # Allow all origins for development
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True
)

# Additional CORS headers for tunnel compatibility
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Store valid QR codes with timestamps
valid_qr_codes = {}
attendance_records = []
QR_VALIDITY_SECONDS = 30

# Excel file configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE_PATH = os.path.join(BASE_DIR, '..', 'public', 'Y24 - AIDS LIST (2).xlsx')

def generate_random_data(length=10):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def generate_qr_image(data):
    """Generate QR code image with better error handling"""
    try:
        # Create QR code with specific settings
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        print(f"Error generating QR image: {e}")
        return None

def cleanup_expired_qr_codes():
    """Remove expired QR codes from the valid_qr_codes dictionary"""
    current_time = time.time()
    expired_codes = [code for code, timestamp in valid_qr_codes.items() 
                    if current_time - timestamp > QR_VALIDITY_SECONDS]
    for code in expired_codes:
        del valid_qr_codes[code]
    if expired_codes:
        print(f"Cleaned up {len(expired_codes)} expired QR codes")

@app.route('/qr')
def get_qr():
    """Generate and return a new QR code"""
    try:
        cleanup_expired_qr_codes()
        
        data = generate_random_data()
        image = generate_qr_image(data)
        
        if image is None:
            return jsonify({"error": "Failed to generate QR code"}), 500
        
        # Store the QR code with current timestamp
        valid_qr_codes[data] = time.time()
        
        print(f"Generated QR code: {data}")
        
        return jsonify({
            "data": data, 
            "image": image,
            "timestamp": time.time(),
            "expires_in": QR_VALIDITY_SECONDS
        })
    except Exception as e:
        print(f"Error in get_qr: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/validate', methods=['POST'])
def validate_qr():
    """Validate a QR code scanned by a student"""
    try:
        cleanup_expired_qr_codes()
        
        data = request.json
        qr_code = data.get('qr_code')
        student_id = data.get('student_id')
        student_name = data.get('student_name')
        
        print(f"Validation request: QR={qr_code}, Student={student_id}")
        
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
                    'message': 'You have already marked attendance with this QR code'
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
                print(f"✅ Attendance marked: {attendance_record}")
                
                # Update Excel file
                update_excel_file()
                
                return jsonify({
                    'valid': True,
                    'message': f'Attendance marked successfully for {student_name}!',
                    'timestamp': attendance_record['timestamp']
                })
            else:
                # QR code expired
                del valid_qr_codes[qr_code]
                print(f"❌ QR code expired: {qr_code}")
                return jsonify({
                    'valid': False,
                    'message': 'QR code has expired. Please scan a new one.'
                }), 400
        else:
            print(f"❌ Invalid QR code: {qr_code}")
            return jsonify({
                'valid': False,
                'message': 'Invalid QR code. Please scan a valid QR code.'
            }), 400
            
    except Exception as e:
        print(f"Error in validate_qr: {e}")
        return jsonify({
            'valid': False,
            'message': f'Server error: {str(e)}'
        }), 500

def update_excel_file():
    """Update the Excel file with attendance records"""
    try:
        if not os.path.exists(EXCEL_FILE_PATH):
            print(f"Excel file not found: {EXCEL_FILE_PATH}")
            return False
        
        # Read the existing Excel file
        df = pd.read_excel(EXCEL_FILE_PATH)
        
        # Add attendance columns if they don't exist
        if 'Attendance_Status' not in df.columns:
            df['Attendance_Status'] = 'Absent'
        if 'Attendance_Time' not in df.columns:
            df['Attendance_Time'] = ''
        if 'QR_Code_Used' not in df.columns:
            df['QR_Code_Used'] = ''
        
        # Update attendance for students who scanned QR
        for record in attendance_records:
            student_id = record['student_id']
            
            # Try different possible column names for student ID
            possible_id_columns = ['Student_ID', 'ID', 'Roll_No', 'RollNo', 'Student ID', 'Roll No']
            
            student_found = False
            for col in possible_id_columns:
                if col in df.columns:
                    mask = df[col].astype(str).str.strip() == str(student_id).strip()
                    if mask.any():
                        df.loc[mask, 'Attendance_Status'] = 'Present'
                        df.loc[mask, 'Attendance_Time'] = record['timestamp']
                        df.loc[mask, 'QR_Code_Used'] = record['qr_code']
                        student_found = True
                        print(f"✅ Updated attendance for {student_id}")
                        break
            
            if not student_found:
                print(f"❌ Student ID {student_id} not found in Excel file")
        
        # Save the updated Excel file
        df.to_excel(EXCEL_FILE_PATH, index=False)
        print(f"✅ Excel file updated: {EXCEL_FILE_PATH}")
        return True
        
    except Exception as e:
        print(f"❌ Error updating Excel file: {e}")
        return False

@app.route('/download/excel')
def download_excel():
    """Download the updated Excel file"""
    try:
        # Update Excel file with latest attendance
        update_excel_file()
        
        if os.path.exists(EXCEL_FILE_PATH):
            return send_file(
                EXCEL_FILE_PATH,
                as_attachment=True,
                download_name=f'Attendance_Report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx',
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        else:
            return jsonify({
                'error': 'Excel file not found',
                'path': EXCEL_FILE_PATH
            }), 404
            
    except Exception as e:
        print(f"Error in download_excel: {e}")
        return jsonify({
            'error': str(e),
            'attendance_records': attendance_records,
            'total_count': len(attendance_records)
        }), 500

@app.route('/attendance/summary')
def attendance_summary():
    """Get current attendance summary"""
    return jsonify({
        'total_scanned': len(attendance_records),
        'valid_qr_codes': len(valid_qr_codes),
        'attendance_records': attendance_records
    })

@app.route('/debug/path')
def debug_path():
    """Debug endpoint to check file paths"""
    return jsonify({
        'excel_file_path': EXCEL_FILE_PATH,
        'file_exists': os.path.exists(EXCEL_FILE_PATH),
        'base_dir': BASE_DIR,
        'current_dir': os.getcwd()
    })

if __name__ == '__main__':
    print("🚀 Starting Flask API...")
    print(f"📁 Excel file path: {EXCEL_FILE_PATH}")
    print(f"📁 File exists: {os.path.exists(EXCEL_FILE_PATH)}")
    
    app.run(debug=True, port=5000, host='0.0.0.0')