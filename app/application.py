import base64
import datetime
import io
import json
import os
import sys

import face_recognition
import numpy as np
from PIL import Image
from flask import Flask, render_template, request, current_app
from flask_socketio import SocketIO, emit

from app.settings import get_config
from app.utils.faceutils import check_wink, clear_face_cache

app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path='/static')
socket_io = SocketIO()
socket_io.init_app(app)

# Load a sample picture and learn how to recognize it.
lyb_image = face_recognition.load_image_file("static/lyb/picture_24.png")
lyb_face_encoding = face_recognition.face_encodings(lyb_image)[0]

known_face_encodings = [lyb_face_encoding]
known_face_names = ['Liuyanbo']
# 眨眼检测的最少次数
min_wink_count = 0
max_wink_count = 50
# 张嘴检测的最小次数
min_mouth_count = 0
max_mouth_count = 50
# 摇头检测的最小次数
min_head_count = 0
max_head_count = 50
error_result = {
    'pass': False,
    'living': False,
    'matching': False,
    'msg': ''
}


@socket_io.on('unknown_img', namespace='/notice')
def video_stream(data):
    if len(known_face_encodings) == 0:
        results = []
        error_result['uninit'] = True
        error_result['msg'] = 'not init face lib'
        results.append(error_result)
        emit('server', {'data': json.dumps(results)}, namespace='/notice')
    if app.config['BIO_ASSAY_STYLE'] == 'AUTO':
        _model = data['model']
    else:
        _model = app.config['BIO_ASSAY_STYLE']
    image_data = base64.urlsafe_b64decode(data['data'][22:])
    if len(image_data) > 256:
        unknown_img = np.array(Image.open(io.BytesIO(image_data)).convert("RGB"))
        unknown_face_locations = face_recognition.face_locations(unknown_img)
        if len(unknown_face_locations) > 0:
            if _model == 'IR':
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
    json_loads = json.loads(bio_assay_)
    wink_count = json_loads['wink_count']
    wink_count_success = json_loads['wink_count_success']
    mouth_count = json_loads['mouth_count']
    mouth_count_success = json_loads['mouth_count_success']
    head_count = json_loads['head_count']
    head_count_success = json_loads['head_count_success']
    results = []
    for (top, right, bottom, left), face_landmark in zip(unknown_face_locations, face_landmarks):
        eye_ear = (check_wink(face_landmark['left_eye']) + check_wink(face_landmark['right_eye'])) / 2
        lip_aer = 0
        head_aer = 0
        _face_location = {'top': top,
                          'right': right,
                          'bottom': bottom,
                          'left': left,
                          'name': ''}
        if wink_count < max_wink_count and wink_count_success <= min_wink_count:
            wink_count += 1
            if eye_ear < float(app.config['FACE_EYS_WINK']) or min_wink_count == 0:
                wink_count_success += 1
            result = {'wink_count': wink_count,
                      'wink_count_success': wink_count_success,
                      'wink_success': wink_count_success >= min_wink_count,
                      'mouth_count': 0,
                      'mouth_count_success': 0,
                      'mouth_success': False,
                      'head_count': 0,
                      'head_count_success': 0,
                      'head_success': False,
                      'pass': False,
                      'location': _face_location,
                      'tips_msg': 'Please Wink'}
        elif mouth_count < max_mouth_count and mouth_count_success <= min_mouth_count:
            mouth_count += 1
            if lip_aer < float(app.config['FACE_MOUTH_OPEN']) or min_mouth_count == 0:
                mouth_count_success += 1
            result = {'wink_count': max_wink_count,
                      'wink_count_success': min_wink_count,
                      'wink_success': True,
                      'mouth_count': mouth_count,
                      'mouth_count_success': mouth_count_success,
                      'mouth_success': mouth_count_success >= min_mouth_count,
                      'head_count': 0,
                      'head_count_success': 0,
                      'head_success': False,
                      'pass': False,
                      'location': _face_location,
                      'tips_msg': 'Please opened and shut Mouth'}
        elif head_count < max_head_count and head_count_success <= min_head_count:
            head_count += 1
            if head_aer < float(app.config['FACE_HEAD_MOVE']) or min_head_count == 0:
                head_count_success += 1
            result = {'wink_count': max_wink_count,
                      'wink_count_success': min_wink_count,
                      'wink_success': True,
                      'mouth_count': max_mouth_count,
                      'mouth_count_success': min_mouth_count,
                      'mouth_success': True,
                      'head_count': head_count,
                      'head_count_success': head_count_success,
                      'head_success': head_count_success >= min_head_count,
                      'pass': False,
                      'location': _face_location,
                      'tips_msg': 'Please Shaking head'}
        if result['wink_success'] and result['mouth_success'] and result['head_success']:
            result['living'] = True
            unknown_encodings = face_recognition.face_encodings(unknown_img, unknown_face_locations)
            compare_faces = face_recognition.compare_faces(known_face_encodings, unknown_encodings[0])
            index = np.argmin(face_recognition.face_distance(known_face_encodings, unknown_encodings[0]))
            if len(compare_faces) != 0 and compare_faces[index]:
                if bool(app.config['FACE_CLEAR_CACHE']):
                    clear_face_cache(index, known_face_encodings)
                    clear_face_cache(index, known_face_names)
                result['pass'] = True
                result['location']['name'] = known_face_names[index]
            else:
                error_result['living'] = True
                error_result['msg'] = 'unMatching'
                emit('server', {'data': json.dumps([error_result])}, namespace='/notice')
        results.append(result)
    emit('server', {'data': json.dumps(results)}, namespace='/notice')


def _ir(unknown_img, unknown_face_locations):
    """
    红外摄像头验证方法，因为红外摄像默认就可以进行活体认证，因此这里不需要活体认证方法
    :param unknown_img: 从前端传过来的图像
    :param unknown_face_locations: 根据图像获取的人脸位置
    :return: 认证信息
    """
    results = []
    tolerance = float(app.config['TOLERANCE'])
    unknown_encodings = face_recognition.face_encodings(unknown_img, unknown_face_locations)
    for (top, right, bottom, left), unknown_encoding in zip(unknown_face_locations, unknown_encodings):
        compare_faces = face_recognition.compare_faces(known_face_encodings, unknown_encoding, tolerance)
        name = 'Unknown'
        _pass = False
        result = {}
        face_distances = face_recognition.face_distance(known_face_encodings, unknown_encoding)
        best_match_index = np.argmin(face_distances)
        if compare_faces[best_match_index]:
            if bool(app.config['FACE_CLEAR_CACHE']):
                clear_face_cache(best_match_index, known_face_encodings)
            name = known_face_names[best_match_index]
            _pass = True
            _face_location = {'top': top,
                              'right': right,
                              'bottom': bottom,
                              'left': left,
                              'name': name}
            result['matching'] = True
            result = {'location': _face_location,
                      'pass': _pass,
                      'living': True
                      }
        else:
            error_result['msg'] = 'unMatching'
            error_result['living'] = True
            result = error_result
        results.append(result)
    emit('server', {'data': json.dumps(results)}, namespace='/notice')


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
        _clear_ = request.form['clear']
        _tolerance = request.form['tolerance']
        app.config['BIO_ASSAY_STYLE'] = _model_
        app.config['FACE_CLEAR_CACHE'] = _clear_ != 'false'
        app.config['TOLERANCE'] = _tolerance
        if app.config['BIO_ASSAY_STYLE'] != 'IR':
            app.config['FACE_EYS_WINK'] = request.form['eyeear']
            app.config['FACE_HEAD_MOVE'] = request.form['headear']
            app.config['FACE_MOUTH_OPEN'] = request.form['mouthear']
        return render_template("/settings.html", success='true', result=_getconfig())


def _getconfig():
    _model_ = app.config['BIO_ASSAY_STYLE']
    _clear_ = app.config['FACE_CLEAR_CACHE']
    _tolerance = app.config['TOLERANCE']
    if app.config['BIO_ASSAY_STYLE'] != 'IR':
        _eyeear_ = app.config['FACE_EYS_WINK']
        _headear_ = app.config['FACE_HEAD_MOVE']
        _mouthear_ = app.config['FACE_MOUTH_OPEN']
        result = {'_model_': _model_,
                  '_clear_': _clear_,
                  '_eyeear_': _eyeear_,
                  '_headear_': _headear_,
                  '_mouthear_': _mouthear_,
                  '_tolerance': _tolerance
                  }
    else:
        result = {'_model_': _model_,
                  '_clear_': _clear_,
                  '_tolerance': _tolerance
                  }
    return json.dumps(result)


@app.route('/model', methods=['GET'])
def model_index():
    return render_template('index_model.html')


@app.route('/api/model', methods=['GET'])
def api_model():
    return json.dumps({'model': app.config['BIO_ASSAY_STYLE']})


@app.route('/safari', methods=['GET'])
def index_safari():
    return render_template('/index_safari.html')


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
        file_path = os.path.join(path, card_id + os.path.splitext(file.filename)[1]);
        file.save(file_path)
        upload_face_image = face_recognition.load_image_file(file_path)
        upload_face_encoding = face_recognition.face_encodings(upload_face_image)[0]
        if card_id in known_face_names:
            _name_index = known_face_names.index(card_id)
            known_face_names[_name_index] = upload_face_encoding
        else:
            known_face_encodings.append(upload_face_encoding)
            known_face_names.append(card_id)
        return render_template("/upload.html", success='true')


@app.route('/favicon.ico')
def get_fav():
    return current_app.send_static_file('favicon.ico')


if len(sys.argv) > 1:
    env = sys.argv[1]
else:
    env = os.environ.get('ENV', 'ir')

if __name__ == '__main__':
    app.config.from_object(get_config('gen'))
    app.run(host='0.0.0.0', port=5001, debug=True, ssl_context=('server-cert.pem', 'server-key.pem'))
