class setting():
    UPLOAD_FOLDER = 'E:\\MyProject\\FaceDemo\\image'
    TOLERANCE = 0.6
    # 眨眼阈值
    FACE_EYS_WINK = 0.3
    # 张嘴阈值
    FACE_MOUTH_OPEN = 0.5
    # 摇头阈值
    FACE_HEAD_MOVE = 0.5


class IR_setting(setting):
    # 红外检测 IR
    BIO_ASSAY_STYLE = 'IR'


class GEN_setting(setting):
    # 移动检测 GEN
    BIO_ASSAY_STYLE = 'GEN'



settings_map = {'ir': IR_setting,
                'gen': GEN_setting}


def get_config(env="ir"):
    return settings_map[env]
