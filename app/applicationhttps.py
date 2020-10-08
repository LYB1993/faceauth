import json

import face_recognition
from flask import request

from app.new_utils import _new_gen
from app.old_utils import app


@app.route('/new/video', methods=['POST'])
def new_video():
    file = request.files['file']
    data = json.loads('data')
    unknown_face_image = face_recognition.load_image_file(file)
    unknown_face_encoding = face_recognition.face_encodings(unknown_face_image)[0]
    result = _new_gen(unknown_face_image, unknown_face_encoding, data)
    return json.dumps(result, default=lambda o: o.__dict__)
