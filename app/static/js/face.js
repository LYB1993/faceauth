/**
 * face js 初始化方法
 */
function Face() {
	const _def_video_att = {
		width: 240,
		height: 240,
		autoplay: 'autoplay'
	};
	const _scr_data_v = $('<video/>', _def_video_att);
	const _display_v = $('<video/>', _def_video_att);
	const _p = $('<p/>')
	let _send_canvas;
	let _box_canvas;
	const _def_back_img = '';
	let noticeSocket;
	let model = 'IR';

	let send_msg =
		'{"wink_count":0,"wink_count_success":0,"mouth_count":0,"mouth_count_success":0,"head_count":0,"head_count_success":0}'


	let face_tag;
	let videos = [];
	let _close_stream = [];

	let result = {
		'success': false
	}

	function init(host) {
		if ($ !== undefined) {
			face_tag = $('face-div');
		}
		if (face_tag === undefined || face_tag.length === 0) {
			console.error('未初始化face-div标签');
			return;
		}
		// jQuery.extend(_def_video_att, config);
		if (io !== undefined) {
			let url = 'http://' + host + '/notice';
			noticeSocket = io(url, {
				autoConnect: false
			});
		}
		videos.push(_scr_data_v);
		videos.push(_display_v);
		_send_canvas = $('<canvas/>', {
			width: _def_video_att['width'],
			height: _def_video_att['height']
		});
		if (face_tag.attr('display-box') === 'true') {
			_box_canvas = $('<canvas/>', {
				width: _def_video_att['width'],
				height: _def_video_att['height']
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
			navigator.mediaDevices.enumerateDevices().then(function(devices) {
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
		_sendImg();
		_receive();
	}

	function _sendImg() {
		let _send_context = _send_canvas.getContext('2d')
		_scr_data_v.addEventListener('timeupdate', event => {
			_send_context.drawImage(_scr_data_v, 0, 0);
			let base64 = _send_canvas.toDataURL('images/png');
			let timestamp = Math.round(new Date() / 1000)
			if (timestamp % 3 === 0) {
				if (noticeSocket) {
					if (model === 'IR') {
						noticeSocket.emit('unknown_img', {
							data: base64
						})
					} else {
						noticeSocket.emit('unknown_img', {
							data: base64,
							bioAssay: send_msg
						})
					}

				}
			}
		})
	}

	function _receive() {
		if (noticeSocket) {
			noticeSocket.on('server', req => {
				let reqdata = JSON.parse(req.data);
				if (reqdata['success'] || reqdata['success'] === 'true') {
					result['success'] = true;
					noticeSocket.close();
					return;
				}
				if (model !== 'IR') {
					send_msg = req.data
					_p.innerHTML = JSON.parse(req.data)['tips_msg'];
				}
			})
		}
	}

	function _result() {
		return result;
	}

	return {
		init: init,
		result: _result
	}
};
