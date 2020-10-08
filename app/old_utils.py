import json

import face_recognition
import numpy as np
from flask_socketio import emit

from app.GyUtils import app, known_face_encodings, known_face_names
from app.utils.faceutils import clear_face_cache, check_wink

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
