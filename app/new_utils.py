import face_recognition
import numpy as np
from flask import json

from app.GyUtils import app, known_face_encodings
from app.Result import Result
from app.utils.faceutils import check_wink


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
        location = {'top': top,
                    'right': right,
                    'bottom': bottom,
                    'left': left}
        compare_faces = face_recognition.compare_faces(known_face_encodings, unknown_encoding, tolerance)
        face_distances = face_recognition.face_distance(known_face_encodings, unknown_encoding)
        best_match_index = np.argmin(face_distances)
        if compare_faces[best_match_index]:
            result = Result(location, True, True)
            results.append(result)
    return json.dumps(results)


def _new_gen(unknown_img, unknown_face_locations, data):
    eye = app.config['FACE_EYS_WINK_OPEN']
    mouth = app.config['FACE_MOUTH_OPEN_OPEN']
    head = app.config['FACE_HEAD_MOVE_OPEN']
    a_count_ = data['a-count']
    s_count_ = data['s-count']
    feature = data['feature']
    face_landmark = face_recognition.face_landmarks(unknown_img, unknown_face_locations)[0]
    location = {'top': unknown_face_locations[0][0],
                'right': unknown_face_locations[0][1],
                'bottom': unknown_face_locations[0][2],
                'left': unknown_face_locations[0][3]}
    if feature == 1:
        if eye and a_count_ <= 50 and s_count_ < 3:
            eye_ear = (check_wink(face_landmark['left_eye']) + check_wink(face_landmark['right_eye'])) / 2
            a_count_ += 1
            if eye_ear > 0.25:
                s_count_ += 1
            return Result(location, s_count_ >= 3, False, 'Please Wink',
                          {'feature': 1, 'a-count': a_count_, 's-count': s_count_})
        else:
            return Result(location, False, False, '', {'feature': 2})
    elif feature == 2:
        if mouth and a_count_ <= 50 and s_count_ < 3:
            a_count_ += 1
            mouth_ear = 10
            if mouth_ear > 0.25:
                s_count_ += 1
            return Result(location, s_count_ >= 3, False, 'Please Mouth',
                          {'feature': 2, 'a-count': a_count_, 's-count': s_count_})
        else:
            return Result(location, False, False, '', {'feature': 3})
    elif feature == 3:
        if head:
            a_count_ += 1
            head_ear = 10
            if head_ear > 0.25:
                s_count_ += 1
            return Result(location, s_count_ >= 3, False, 'Please Head',
                          {'feature': 3, 'a-count': a_count_, 's-count': s_count_})
        else:
            return Result(location, False, False, '', {'feature': -1})
    elif feature == -1:
        unknown_encoding = face_recognition.face_encodings(unknown_img, unknown_face_locations)[0]
        compare_faces = face_recognition.compare_faces(known_face_encodings, unknown_encoding)
        index = np.argmin(face_recognition.face_distance(known_face_encodings, unknown_encoding))
        return Result(location, True, bool(compare_faces[index]), 'check complete')
