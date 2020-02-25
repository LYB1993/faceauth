import base64
import datetime
import io
import json
import os
import sys

import distance
import face_recognition
import numpy as np
from PIL import Image
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from werkzeug.utils import redirect

from app.settings import get_config

app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path='/static')
socket_io = SocketIO()
socket_io.init_app(app)

# Load a sample picture and learn how to recognize it.
lyb_image = face_recognition.load_image_file("static/lyb/picture_24.png")
lyb_face_encoding = face_recognition.face_encodings(lyb_image)[0]

known_face_encodings = [
    lyb_face_encoding
]
known_face_names = [
    "Liuyanbo"
]
# 眨眼检测的最少次数
min_wink_count = 3
max_wink_count = 5
# 张嘴检测的最小次数
min_mouth_count = 3
max_mouth_count = 5
# 摇头检测的最小次数
min_head_count = 3
max_head_count = 5


@socket_io.on('unknown_img', namespace='/notice')
def video_stream(data):
    image_data = base64.urlsafe_b64decode(data['data'][22:])
    unknown_img = np.array(Image.open(io.BytesIO(image_data)).convert("RGB"))
    unknown_face_locations = face_recognition.face_locations(unknown_img)
    if len(unknown_face_locations) > 0:
        if app.config['BIO_ASSAY_STYLE'] == 'IR':
            _ir(unknown_img, unknown_face_locations)
        else:
            bio_assay_ = data['bioAssay']
            _gen(unknown_img, unknown_face_locations, bio_assay_)


def _gen(unknown_img, unknown_face_locations, bio_assay_):
    """
    普通摄像头的认证，需要进行活体检验，可设置活体检验方式
    :param unknown_img: 从前端传过来的图像
    :param unknown_face_locations: 根据图像获取的人脸位置
    :param bio_assay_: 活体检验数据，每次检验后回先传递给前端，再由前端发回服务端，用于知道上次的检验结果
    :return: 活体检验数据，每次检验后回先传递给前端，再由前端发回服务端，用于知道上次的检验结果
    """
    face_landmarks = face_recognition.face_landmarks(unknown_img, unknown_face_locations)
    wink_count = json.loads(bio_assay_)['wink_count']
    wink_count_success = json.loads(bio_assay_)['wink_count_success']
    mouth_count = json.loads(bio_assay_)['mouth_count']
    mouth_count_success = json.loads(bio_assay_)['mouth_count_success']
    head_count = json.loads(bio_assay_)['head_count']
    head_count_success = json.loads(bio_assay_)['head_count_success']
    results = []
    for face_landmark in face_landmarks:
        eye_ear = (check_wink(face_landmark['left_eye']) + check_wink(face_landmark['right_eye'])) / 2
        lip_aer = 0
        head_aer = 0
        if wink_count < max_wink_count:
            wink_count += 1
            if eye_ear < app.config['FACE_EYS_WINK']:
                wink_count_success += 1
            results = {'wink_count': wink_count,
                       'wink_count_success': wink_count_success,
                       'wink_success': wink_count_success >= min_wink_count,
                       'mouth_count': 0,
                       'mouth_count_success': 0,
                       'mouth_success': False,
                       'head_count': 0,
                       'head_count_success': 0,
                       'head_success': False,
                       'pass': False,
                       'tips_msg': 'Please Wink'}
        elif mouth_count < max_mouth_count:
            mouth_count += 1
            if lip_aer < app.config['FACE_MOUTH_OPEN']:
                head_count_success += 1
            results = {
                'wink_count': max_wink_count,
                'wink_count_success': 0,
                'wink_success': False,
                'mouth_count': mouth_count,
                'mouth_count_success': mouth_count_success,
                'mouth_success': mouth_count_success >= min_mouth_count,
                'head_count': 0,
                'head_count_success': 0,
                'head_success': False,
                'pass': False,
                'tips_msg': 'Please opened and shut Mouth'}
        else:
            head_count += 1
            if head_aer < app.config['FACE_HEAD_MOVE']:
                head_count_success += 1
            results = {'wink_count': max_wink_count,
                       'wink_count_success': 0,
                       'wink_success': False,
                       'mouth_count': max_mouth_count,
                       'mouth_count_success': 0,
                       'mouth_success': False,
                       'head_count': head_count,
                       'head_count_success': head_count_success,
                       'head_success': head_count_success >= min_head_count,
                       'pass': False,
                       'tips_msg': 'Please Shaking head'}
    if results['wink_success'] and results['mouth_success'] and results['head_success']:
        results['psss'] = True
    emit('server', {'data': json.dumps(results)}, namespace='/notice')
    return


def _ir(unknown_img, unknown_face_locations):
    """
    红外摄像头验证方法，因为红外摄像默认就可以进行活体认证，因此这里不需要活体认证方法
    :param unknown_img: 从前端传过来的图像
    :param unknown_face_locations: 根据图像获取的人脸位置
    :return: 认证信息
    """
    results = []
    tolerance = app.config['TOLERANCE']
    unknown_encodings = face_recognition.face_encodings(unknown_img, unknown_face_locations)
    for (top, right, bottom, left), unknown_encoding in zip(unknown_face_locations, unknown_encodings):
        compare_faces = face_recognition.compare_faces(known_face_encodings, unknown_encoding)
        name = 'Unknown'
        _pass = False
        face_distances = face_recognition.face_distance(known_face_encodings, unknown_encoding)
        best_match_index = np.argmin(face_distances)
        if compare_faces[best_match_index]:
            name = known_face_names[best_match_index]
            _pass = True
        result = {'top': top,
                  'right': right,
                  'bottom': bottom,
                  'left': left,
                  'name': name,
                  'pass': _pass
                  }
        results.append(result)
    emit('server', {'data': json.dumps(results)}, namespace='/notice')


def check_wink(eye):
    eye_03 = distance.euclidean(eye[0], eye[3])
    eye_15 = distance.euclidean(eye[1], eye[5])
    eye_24 = distance.euclidean(eye[2], eye[4])
    ear = (eye_15 + eye_24) / (2 * eye_03)
    return ear


@app.route('/face', methods=['GET'])
def to_face():
    """
    根据配置跳转页面，IR为红外摄像头页面，否则为普通页面
    :return: 页面地址
    """
    if app.config['BIO_ASSAY_STYLE'] == 'IR':
        return render_template('/index_syn.html')
    else:
        return render_template('/index_choose.html')


@app.route('/settings', methods=['GET', 'POST'])
def to_settings():
    """
    进入设置页面，可设置摄像头种类，以及验证活体时的参数信息
    :return: 设置页面
    """
    if request.method != 'POST':
        return render_template('/settings.html', result=_getconfig())
    else:
        _model_ = request.form['model']
        _tolerance = request.form['tolerance']
        app.config['BIO_ASSAY_STYLE'] = _model_
        app.config['TOLERANCE'] = _tolerance
        if app.config['BIO_ASSAY_STYLE'] != 'IR':
            app.config['FACE_EYS_WINK'] = request.form['eyeear']
            app.config['FACE_HEAD_MOVE'] = request.form['headear']
            app.config['FACE_MOUTH_OPEN'] = request.form['mouthear']
        return render_template("/settings.html", success='true', result=_getconfig())


def _getconfig():
    _model_ = app.config['BIO_ASSAY_STYLE']
    _tolerance = app.config['TOLERANCE']
    if app.config['BIO_ASSAY_STYLE'] != 'IR':
        _eyeear_ = app.config['FACE_EYS_WINK']
        _headear_ = app.config['FACE_HEAD_MOVE']
        _mouthear_ = app.config['FACE_MOUTH_OPEN']
        result = {'_model_': _model_,
                  '_eyeear_': _eyeear_,
                  '_headear_': _headear_,
                  '_mouthear_': _mouthear_,
                  '_tolerance': _tolerance
                  }
    else:
        result = {'_model_': _model_,
                  '_tolerance': _tolerance
                  }
    return json.dumps(result)


@app.route('/model', methods=['GET'])
def model_index():
    return render_template('index_model.html')


@app.route('/upload', methods=['GET', 'POST'])
def upload_image():
    if request.method != 'POST':
        return render_template('/upload.html')
    else:
        file = request.files['file']
        card_id = request.form['cardid']
        path = os.path.join(app.config['UPLOAD_FOLDER'], datetime.datetime.now().strftime('%Y-%m-%d'))
        if not os.path.exists(path):
            os.mkdir(path)
        file.save(os.path.join(path, card_id + os.path.splitext(file.filename)[1]))
        return redirect('/upload', success='true')


if len(sys.argv) > 1:
    env = sys.argv[1]
else:
    env = os.environ.get('ENV', 'ir')

if __name__ == '__main__':
    app.config.from_object(get_config('gen'))
    app.run(host='0.0.0.0', port=5001, debug=True, ssl_context=('server-cert.pem', 'server-key.pem'))
