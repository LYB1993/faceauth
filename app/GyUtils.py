import json

import face_recognition
from flask import Flask, current_app, request, render_template

app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path='/static')

# Load a sample picture and learn how to recognize it.
lyb_image = face_recognition.load_image_file("static/lyb/picture_24.png")
lyb_face_encoding = face_recognition.face_encodings(lyb_image)[0]

known_face_encodings = [lyb_face_encoding]
known_face_names = ['Liuyanbo']


@app.route('/favicon.ico')
def get_fav():
    return current_app.send_static_file('favicon.ico')


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
