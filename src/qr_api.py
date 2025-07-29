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
import ssl

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Store valid QR codes with timestamps
valid_qr_codes = {}
attendance_records = []
QR_VALIDITY_SECONDS = 30

# Get the absolute path to ensure it works from any directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Go up two levels from src/
EXCEL_FILE_PATH = os.path.join(BASE_DIR, 'public', 'Y24 - AIDS LIST (2).xlsx')

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

def update_excel_file():
    """Update the default Excel file with attendance records"""
    try:
        # Print the full path for debugging
        print(f"Looking for Excel file at: {EXCEL_FILE_PATH}")
        
        # Check if file exists
        if not os.path.exists(EXCEL_FILE_PATH):
            print(f"Excel file not found at {EXCEL_FILE_PATH}")
            print(f"Current working directory: {os.getcwd()}")
            print(f"Files in public directory: {os.listdir(os.path.join(BASE_DIR, 'public')) if os.path.exists(os.path.join(BASE_DIR, 'public')) else 'Public directory not found'}")
            return False
        
        # Read the existing Excel file (our default file)
        df = pd.read_excel(EXCEL_FILE_PATH)
        print(f"Excel file loaded successfully. Shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
        
        # Add attendance columns if they don't exist
        if 'Attendance_Status' not in df.columns:
            df['Attendance_Status'] = 'Absent'
        if 'Attendance_Time' not in df.columns:
            df['Attendance_Time'] = ''
        if 'QR_Code_Used' not in df.columns:
            df['QR_Code_Used'] = ''
        
        # Reset all students to Absent initially
        df['Attendance_Status'] = 'Absent'
        df['Attendance_Time'] = ''
        df['QR_Code_Used'] = ''
        
        # Update attendance for students who scanned QR
        for record in attendance_records:
            student_id = record['student_id']
            
            # Try different possible column names for student ID
            student_found = False
            for col in ['Student_ID', 'ID', 'Roll_No', 'RollNo', 'Student ID', 'Roll No', 'Reg_No', 'Registration_No']:
                if col in df.columns:
                    # Convert both to string and strip whitespace for comparison
                    mask = df[col].astype(str).str.strip().str.upper() == str(student_id).strip().upper()
                    if mask.any():
                        df.loc[mask, 'Attendance_Status'] = 'Present'
                        df.loc[mask, 'Attendance_Time'] = record['timestamp']
                        df.loc[mask, 'QR_Code_Used'] = record['qr_code']
                        student_found = True
                        print(f"Attendance marked for student: {student_id} in column: {col}")
                        break
            
            if not student_found:
                print(f"Student ID {student_id} not found in Excel file")
        
        # Save back to the same default file
        df.to_excel(EXCEL_FILE_PATH, index=False)
        
        print(f"Default Excel file updated: {EXCEL_FILE_PATH}")
        print(f"Total students present: {len([r for r in attendance_records])}")
        return EXCEL_FILE_PATH
        
    except Exception as e:
        print(f"Error updating Excel file: {e}")
        import traceback
        traceback.print_exc()
        return False

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
            
            # Update the default Excel file immediately
            update_excel_file()
            
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
    """Download the default Excel file with updated attendance"""
    try:
        # Update the Excel file with latest attendance data
        update_excel_file()
        
        if os.path.exists(EXCEL_FILE_PATH):
            return send_file(
                EXCEL_FILE_PATH,
                as_attachment=True,
                download_name=f'Y24_AIDS_Attendance_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx',
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        else:
            return jsonify({
                'error': 'Excel file not found',
                'attendance_records': attendance_records,
                'total_count': len(attendance_records)
            }), 404
            
    except Exception as e:
        print(f"Error in download_excel: {e}")
        return jsonify({
            'error': str(e),
            'attendance_records': attendance_records,
            'total_count': len(attendance_records)
        }), 500

@app.route('/attendance/summary')
def get_attendance_summary():
    """Get current attendance summary without downloading file"""
    return jsonify({
        'attendance_records': attendance_records,
        'total_count': len(attendance_records),
        'students_present': len(set(record['student_id'] for record in attendance_records))
    })

# Add endpoint to reset attendance for new session
@app.route('/reset-attendance', methods=['POST'])
def reset_attendance():
    """Reset attendance records for a new session"""
    global attendance_records, valid_qr_codes
    attendance_records = []
    valid_qr_codes = {}
    
    # Also reset the Excel file to default state
    update_excel_file()
    
    return jsonify({
        'success': True,
        'message': 'Attendance reset successfully'
    })

# Debug endpoint to check file path
@app.route('/debug/path')
def debug_path():
    """Debug endpoint to check file paths"""
    return jsonify({
        'excel_file_path': EXCEL_FILE_PATH,
        'base_dir': BASE_DIR,
        'current_working_dir': os.getcwd(),
        'file_exists': os.path.exists(EXCEL_FILE_PATH),
        'public_dir_exists': os.path.exists(os.path.join(BASE_DIR, 'public')),
        'public_files': os.listdir(os.path.join(BASE_DIR, 'public')) if os.path.exists(os.path.join(BASE_DIR, 'public')) else []
    })

def run_http_server():
    """Run HTTP server on port 5000"""
    print("Starting HTTP server on port 5000...")
    app.run(debug=False, port=5000, host='0.0.0.0', use_reloader=False)

def run_https_server():
    """Run HTTPS server on port 5001"""
    print("Starting HTTPS server on port 5001...")
    try:
        app.run(debug=True, port=5001, host='0.0.0.0', ssl_context='adhoc')
    except Exception as e:
        print(f"HTTPS failed: {e}")
        print("Install pyOpenSSL: pip install pyOpenSSL")
        # Fallback to HTTP on main port
        app.run(debug=True, port=5000, host='0.0.0.0')

if __name__ == '__main__':
    print(f"Starting dual-protocol servers...")
    print(f"Excel file path: {EXCEL_FILE_PATH}")
    print(f"File exists: {os.path.exists(EXCEL_FILE_PATH)}")
    
    # Try to run both HTTP and HTTPS
    try:
        # Start HTTP server in background thread
        http_thread = threading.Thread(target=run_http_server)
        http_thread.daemon = True
        http_thread.start()
        
        # Start HTTPS server in main thread
        run_https_server()
        
    except Exception as e:
        print(f"Dual server setup failed: {e}")
        print("Running single HTTP server...")
        app.run(debug=True, port=5000, host='0.0.0.0')
