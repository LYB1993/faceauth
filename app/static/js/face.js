/**
 * face js 初始化方法
 */
function Face() {
	const _def_video_att = {
		width: '640px',
		height: '480px',
		autoplay: 'autoplay'
	};
	const _scr_data_v = $('<video/>', _def_video_att);
	_scr_data_v.attr('id', 'IR')
	const _display_v = $('<video/>', _def_video_att);
	_display_v.attr('id', 'RGB')
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
			let url = 'https://' + host + '/notice';
			noticeSocket = io(url, {
				autoConnect: false
			});
		}
		videos.push(_scr_data_v);
		videos.push(_display_v);
		_send_canvas = $('<canvas/>');
		_send_canvas.attr('width',_def_video_att['width'])
		_send_canvas.attr('height',_def_video_att['height'])
		_send_canvas.attr('id','send-canvas')
		
		if (face_tag.attr('display-box') === 'true') {
			_box_canvas = $('<canvas/>');
			_box_canvas.attr('width',_def_video_att['width'])
			_box_canvas.attr('height',_def_video_att['height'])
			_box_canvas.attr('id','box-canvas')
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
						if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {}
						if (device.label.indexOf('IR') != -1) {
							initStream(device.deviceId, _scr_data_v[0])
						} else {
							initStream(device.deviceId, _display_v[0])
						}
					}
				});
			});
		}
		_sendImg();
	}

	function initStream(deviceId, obj) {
		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia({
				video: {
					deviceId: {
						exact: deviceId
					}
				},
				audio: false
			}).then(stream => {
				_close_stream.push(stream);
				obj.srcObject = stream;
			}).catch(error => {
				console.error('Not support userMedia')
			});
		}
	}

	function _sendImg() {
		let _send_context = _send_canvas[0].getContext('2d')
		_scr_data_v[0].addEventListener('timeupdate', event => {
			_send_context.drawImage(_scr_data_v[0], 0, 0);
			let base64 = _send_canvas[0].toDataURL('images/png');
			let timestamp = Math.round(new Date() / 1000)
			if (timestamp % 3 === 0) {
				if(noticeSocket.disconnected){
					noticeSocket.open()
				}
				if (noticeSocket.connected) {
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
		console.log('runing')
		if (noticeSocket.connected) {
			noticeSocket.on('server', req => {
				console.log(req)
				let reqdata = JSON.parse(req.data);
				if (reqdata['pass'] || reqdata['pass'] === 'true') {
					result['pass'] = true;
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

	function _receive() {
		
	}

	function _result() {
		return result;
	}

	function close_stream() {
		if (noticeSocket !== undefined && noticeSocket.connected) {
			noticeSocket.close();
		}
		_close_stream.forEach(stream => {
			stream.getTracks().forEach(track => {
				track.stop();
			});
		})
	}

	return {
		init: init,
		close: close_stream,
		result: _result
	}
};
