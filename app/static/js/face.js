/**
 * face js 初始化方法
 */
function Face() {
	let _def_config = {
		width: '640px',
		height: '480px',
		debug: false,
		model: 'IR',
		success: undefined,
		error: undefined
	};

	/**
	 * 需要初始化的标签
	 */
	let _scr_data_v;
	let _display_v;
	const _p = $('<p/>')


	/**
	 * canvas标签L
	 */
	let _send_canvas;
	let _box_canvas;


	let noticeSocket;

	let _model = 'IR';
	let _receive_ready = false
	let _debug = false

	let send_msg =
		'{"wink_count":0,"wink_count_success":0,"mouth_count":0,"mouth_count_success":0,"head_count":0,"head_count_success":0}'


	/**
	 * 自定义标签
	 */
	let face_tag;
	let videos = [];
	let _close_stream = [];

	let result = {
		'success': false
	}



	/**
	 * 初始化方法
	 * @param {Object} host 访问地址和端口
	 * @param {Object} config 自定义配置 
	 */
	function init(url, config) {
		if ($ !== undefined) {
			face_tag = $('face-div');
		}
		if (face_tag === undefined || face_tag.length === 0) {
			console.error('未初始化face-div标签');
			return;
		}
		jQuery.extend(_def_config, config);
		_debug = _def_config.debug;
		_model = _def_config.model;
		inittable();
		if (io !== undefined) {
			let _url = url + '/notice';
			noticeSocket = io(_url, {
				autoConnect: false
			});
		}
		videos.push(_scr_data_v);
		videos.push(_display_v);
		_send_canvas = $('<canvas/>');
		_send_canvas.attr('width', _def_config['width'])
		_send_canvas.attr('height', _def_config['height'])
		_send_canvas.attr('id', 'send-canvas')
		if (!_debug) {
			_send_canvas.hide()
		}
		if (face_tag.attr('display-box') === 'true') {
			_box_canvas = $('<canvas/>');
			_box_canvas.attr('width', _def_config['width'])
			_box_canvas.attr('height', _def_config['height'])
			_box_canvas.attr('id', 'box-canvas')
			_box_canvas.hide()
			face_tag.append(_box_canvas);
		}
		face_tag.append(_scr_data_v);
		face_tag.append(_display_v);
		face_tag.append(_send_canvas);
		_init_webcam();
	}

	function inittable() {
		_scr_data_v = $('<video/>', {
			width: _def_config['width'],
			height: _def_config['height'],
			autoplay: 'autoplay',
			id: 'IR'
		});
		if (!_debug) {
			_scr_data_v.hide()
		}
		_display_v = $('<video/>', {
			width: _def_config['width'],
			height: _def_config['height'],
			autoplay: 'autoplay',
			id: 'RGB'
		});
	}



	/**
	 * 初始化摄像头
	 */
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
		_send_img();
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

	/**
	 * 发送验证图片
	 */
	function _send_img() {
		let _send_context = _send_canvas[0].getContext('2d')
		_scr_data_v[0].addEventListener('timeupdate', event => {
			_send_context.drawImage(_scr_data_v[0], 0, 0);
			let base64 = _send_canvas[0].toDataURL('images/png');
			let timestamp = Math.round(new Date() / 1000)
			if (timestamp % 3 === 0) {
				if (noticeSocket.disconnected) {
					noticeSocket.open()
				}
				if (noticeSocket.connected) {
					if (!_receive_ready) {
						_receive()
					}
					if (_model === 'IR') {
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

	/**
	 * 接收服务端信息
	 */
	function _receive() {
		if (noticeSocket.connected) {
			_receive_ready = true
			noticeSocket.on('server', req => {
				console.log(req)
				let reqdata = JSON.parse(req.data);
				if (reqdata[0]['pass'] || reqdata[0]['pass'] === 'true') {
					result['pass'] = true;
					_fn_close_stream();
					if (_def_config.success != undefined) {
						_def_config.success(result)
					}
					return;
				}
				if (_model !== 'IR') {
					send_msg = JSON.stringify(reqdata[0])
					_p.innerHTML = JSON.parse(req.data)['tips_msg'];
				}
			})
		}

	}

	/**
	 * 返回验证结果
	 */
	function _result() {
		return result;
	}


	/**
	 * 关闭视频流和io连接
	 */
	function _fn_close_stream() {
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
		close: _fn_close_stream,
		result: _result
	}
};


jQuery.extend({
	face: function(url, options) {
		if (typeof url === "object") {
			options = url;
			url = undefined;
		}
		var s = jQuery.extend({url:url}, options);
		s.url = ((url || s.url || location.href) + "")
			.replace(/^\/\//, location.protocol + "//");
		s.model = options.model || s.model;
		s.debug = options.debug || s.debug || false;
		let face = new Face();
		face.init(url, s);
	}
})
