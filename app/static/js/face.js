/**
 * face js 初始化方法
 */
function Face() {
	let config = {
		width: '640px',
		height: '480px',
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

	let model = 'IR';
	let _receive_ready = false

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
	 * @param {Object} config 自定义配置,可配置video标签的属性  
	 * @param {string} model 验证模式 有 "IR" 和"GEN"  
	 * @param {boolean} ssl 是否开启https访问,默认true 
	 */
	function init(host, config, ssl = true, model = "IR") {
		if ($ !== undefined) {
			face_tag = $('face-div');
		}
		if (face_tag === undefined || face_tag.length === 0) {
			console.error('未初始化face-div标签');
			return;
		}
		model = model;
		jQuery.extend(config, config);
		inittable();
		if (io !== undefined) {
			let prefix = 'http://';
			if (ssl) {
				prefix = 'https://'
			}
			let url = prefix + host + '/notice';
			noticeSocket = io(url, {
				autoConnect: false
			});
		}
		videos.push(_scr_data_v);
		videos.push(_display_v);
		_send_canvas = $('<canvas/>');
		_send_canvas.attr('width', config['width'])
		_send_canvas.attr('height', config['height'])
		_send_canvas.attr('id', 'send-canvas')
		_send_canvas.hide()
		if (face_tag.attr('display-box') === 'true') {
			_box_canvas = $('<canvas/>');
			_box_canvas.attr('width', config['width'])
			_box_canvas.attr('height', config['height'])
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
			width: config['width'],
			height: config['height'],
			autoplay: 'autoplay',
			id: 'IR'
		});
		_scr_data_v.hide()
		_display_v = $('<video/>', {
			width: config['width'],
			height: config['height'],
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
					if (config.success != undefined) {
						config.success(result)
					}
					return;
				}
				if (model !== 'IR') {
					send_msg = req.data
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
