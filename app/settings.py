class setting():
    UPLOAD_FOLDER = 'E:\\MyProject\\FaceDemo\\image'


class IR_setting(setting):
    # 红外检测 IR
    BIO_ASSAY_STYLE = 'IR'


class GEN_setting(setting):
    # 移动检测 MOVE
    BIO_ASSAY_STYLE = 'MOVE'
    # 眨眼阈值
    FACE_EYS_WINK = 0.3
    # 张嘴阈值
    FACE_MOUTH_OPEN = 0.5
    # 摇头阈值
    FACE_HEAD_MOVE = 0.5


settings_map = {'ir': IR_setting,
                'gen': GEN_setting}


def get_config(env="ir"):
    return settings_map[env]
