/**
 * face js 初始化方法
 */
function Face() {
    const _def_video_att = {
        width: _def_wight,
        height: _def_height,
        autoplay: 'autoplay'
    };
    const _scr_data_v = $('<video/>', _def_video_att);
    const _display_v = $('<video/>', _def_video_att);
    const _def_height = 240;
    const _def_wight = 240;
    const _def_back_img = '';


    let face_tag;
    let videos = [];
    let _close_stream = [];

    function init() {
        if ($ !== undefined) {
            face_tag = $('face-div');
        } else {
            face_tag = document.getElementsByTagName('face-div');
        }
        if (face_tag.length === 0) {
            console.error('未初始化face-div标签');
            return;
        }
        videos.push(_scr_data_v);
        videos.push(_display_v);
        const _send_canvas = $('<canvas/>', {
            width: _def_wight,
            height: _def_height
        });
        if (face_tag.attr('display-box') === 'true') {
            const _box_canvas = $('<canvas/>', {
                width: _def_wight,
                height: _def_height
            });
            face_tag.append(_box_canvas);
        }
        face_tag.append(_scr_data_v);
        face_tag.append(_display_v);
        face_tag.append(_send_canvas);
        _init_webcam();
    }

    function _init_webcam() {
        let video_init = [];
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices()) {
            navigator.mediaDevices.enumerateDevices().then(function (devices) {
                devices.forEach(device => {
                    if (device.kind === 'videoinput') {
                        let temp = {};
                        temp.video = {
                            deviceId: {
                                exact: device.deviceId
                            }
                        };
                        temp.audio = false;
                        video_init.push(temp)
                    }
                });
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    for (let i = 0; i < video_init.length; i++) {
                        navigator.mediaDevices.getUserMedia(video_init[i]).then(stream => {
                            _close_stream.push(stream);
                            document.getElementsByTagName('video')[i].srcObject = stream;
                        }).catch(error => {
                            console.error('Not support userMedia')
                        });
                    }
                }
            });
        }
    }

    function _sendImg() {
        $('video')
    }


    function _replacedef() {
        let width = face_tag.attr('width');
        let height = face_tag.attr('height');
        return {
            width: width,
            height: height
        }
    };

    return {
        init: init
    }
};





