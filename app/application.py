import base64
import datetime
import io
import json
import os
import sys

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


@socket_io.on('unknown_img', namespace='/notice')
def video_stream(data):
    image_data = base64.urlsafe_b64decode(data['data'][22:])
    unknown_img = np.array(Image.open(io.BytesIO(image_data)).convert("RGB"))
    # randint = random.randint(55, 100)
    # s = 'static/my_picture' + str(randint) + '.jpg'
    # unknown_img = face_recognition.load_image_file(s)
    # pil_image = Image.fromarray(unknown_img)
    # pil_image.save('picture_'+str(randint)+'.png')
    unknown_face_locations = face_recognition.face_locations(unknown_img)
    if app.config['BIO_ASSAY_STYLE'] != 'IR':
        face_landmarks = face_recognition.face_landmarks(unknown_img, unknown_face_locations)
    if len(unknown_face_locations) > 0:
        results = []
        unknown_encodings = face_recognition.face_encodings(unknown_img, unknown_face_locations)
        for (top, right, bottom, left), unknown_encoding in zip(unknown_face_locations, unknown_encodings):
            compare_faces = face_recognition.compare_faces(known_face_encodings, unknown_encoding)
            name = 'Unknown'
            face_distances = face_recognition.face_distance(known_face_encodings, unknown_encoding)
            best_match_index = np.argmin(face_distances)
            if compare_faces[best_match_index]:
                name = known_face_names[best_match_index]
            result = {'top': top,
                      'right': right,
                      'bottom': bottom,
                      'left': left,
                      'name': name
                      }
            results.append(result)
        emit('server', {'data': json.dumps(results)}, namespace='/notice')


@app.route('/', methods=['GET'])
def to_index():
    return render_template('/index_syn.html')


@app.route('/settings', methods=['GET'])
def to_settings():
    return render_template('/settings.html')


@app.route('/upload', methods=['GET', 'POST'])
def upload_image():
    if request.method != 'POST':
        return render_template('/uploadimg.html')
    else:
        file = request.files['file']
        card_id = request.form['cardid']
        path = os.path.join(app.config['UPLOAD_FOLDER'], datetime.datetime.now().strftime('%Y-%m-%d'))
        if not os.path.exists(path):
            os.mkdir(path)
        file.save(os.path.join(path, card_id + os.path.splitext(file.filename)[1]))
        return redirect('/upload')


if len(sys.argv) > 1:
    env = sys.argv[1]
else:
    env = os.environ.get('ENV', 'ir')

if __name__ == '__main__':
    app.config.from_object(get_config(env))
    app.run(host='0.0.0.0', port=5001, debug=True)
