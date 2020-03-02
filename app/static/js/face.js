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
	let _display_v_iphone;
	const _p = $('<p/>')
	const rSafari = /version\/([\w.]+).*(safari)/;
	const matchBS = rSafari.exec(navigator.userAgent.toLowerCase());


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
		face_tag.append(_display_v_iphone)
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
		_display_v_iphone = document.createElement('video')
		_display_v_iphone.setAttribute('id', 'RGB_iPhone');
		_display_v_iphone.setAttribute('autoplay', '');
		_display_v_iphone.autoplay = true
	}



	/**
	 * 初始化摄像头
	 */
	function _init_webcam() {
		if (matchBS != null) {
			navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment'
				},
				audio: false
			}).then(stream => {
				stream.getTracks().forEach(track => {
					track.stop();
				});
				navigator.mediaDevices.enumerateDevices().then(devices => {
					document.getElementById('p1').innerText = 'p1:' + JSON.stringify(devices)
					devices.forEach(device => {
						if (device.kind === 'videoinput' && device.label.indexOf('前置') != -1) {
							document.getElementById('p2').innerText = 'p2:' + device.label
							initStream(device.label, device.deviceId, _display_v_iphone)
						}
					});
				})
			}).catch(error => {})
		} else {
			if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices()) {
				navigator.mediaDevices.enumerateDevices().then(function(devices) {
					devices.forEach(device => {
						if (device.kind === 'videoinput') {
							if (device.label.indexOf('IR') != -1) {
								initStream(device.label, device.deviceId, _scr_data_v[0])
							} else {
								initStream(device.label, device.deviceId, _display_v[0])
							}
						}
					});
				});
			}
		}
		_send_img();
	}

	function initStream(deviceLabel, deviceId, obj) {
		if (deviceLabel.indexOf('back') != -1) {
			return;
		}
		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			document.getElementById('p3').innerText = 'p3:' + deviceLabel
			document.getElementById('p4').innerText = 'p4:' + deviceId
			navigator.mediaDevices.getUserMedia({
				video: {
					deviceId: {
						exact: deviceId
					}
				},
				audio: false
			}).then(stream => {
				document.getElementById('p5').innerText = 'p5:stream'
				_close_stream.push(stream);
				obj.srcObject = stream;
			}).catch(error => {
				console.error('Not support userMedia')
			});
		} else if (navigator.getUserMedia) {
			navigator.getUserMedia({
				video: {
					deviceId: {
						exact: deviceId
					}
				},
				audio: false
			}, stream => {
				_close_stream.push(stream);
				obj.srcObject = stream;
			}, err => {
				console.log('Not support userMedia')
			});
		}
	}

	/**
	 * 发送验证图片
	 */
	function _send_img() {
		let _send_context = _send_canvas[0].getContext('2d')
		let _stream_src;
		if (_model === 'IR') {
			_stream_src = _scr_data_v[0]
		} else {
			if (matchBS != null) {
				_stream_src = _display_v_iphone
			} else {
				_stream_src = _display_v[0]
			}
		}
		// document.getElementById('p4').innerText = 'p4:_send_img()end'
		// _stream_src.addEventListener('timeupdate', event => {
		// 	document.getElementById('p1').innerText = 'p1:ontimeupdate()end'
		// }, false)
		// _stream_src.addEventListener('loadstart', event => {
		// 	document.getElementById('p5').innerText = 'p5:onloadstart()end'
		// })
		// _stream_src.addEventListener('play', event => {
		// 	document.getElementById('p3').innerText = 'p3:play()end'
		// })
		// _stream_src.addEventListener('canplay', event => {
		// 	document.getElementById('p2').innerText = 'p2:oncanplay()end'
		// })
		// _stream_src.play()
		document.getElementById('p6').innerText = 'p6:' + _stream_src.currentTime
		_stream_src.addEventListener('timeupdate', event => {
			document.getElementById('p1').innerText = 'p1:timeupdate'
			_send_context.drawImage(_stream_src, 0, 0);
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
					result['success'] = true;
					_fn_close_stream();
					if (_def_config.success != undefined) {
						_def_config.success(result)
					}
					return;
				}
				if (_model !== 'IR') {
					send_msg = JSON.stringify(reqdata[0])
					_p[0].innerHTML = JSON.parse(req.data)[0]['tips_msg'];
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
		var s = jQuery.extend({
			url: url
		}, options);
		s.url = ((url || s.url || location.href) + "")
			.replace(/^\/\//, location.protocol + "//");
		s.model = 'IR'
		s.debug = options.debug || s.debug || false;
		$.ajax(url + '/api/model', {
			dataType: 'json', //服务器返回json格式数据
			type: 'get', //HTTP请求类型
			timeout: 10000, //超时时间设置为10秒；
			success: function(data) {
				if (data.model !== undefined || data.model !== '') {
					s.model = data.model;
				}
				let face = new Face();
				face.init(url, s);
			},
			error: function(xhr, type, errorThrown) {
				let face = new Face();
				face.init(url, s);
			}
		});
	}
})
