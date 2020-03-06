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
	let _send_canvas;
	let _box_canvas;
	let _box_context;
	let _scr_data_v;
	let _display_v;
	let _display_v_iphone;
	const _p = $('<p/>');
	const _error_msg = $('<p/>');
	let video_w;
	let video_h;

	/**
	 * 校验浏览器以及平台信息
	 */
	const matchBS = navigator.userAgent.toLowerCase();
	let isWin = false;
	let isMac = false;
	let isAndroid = false;
	let unKnow = false;

	/**
	 * socket 对象
	 */
	let noticeSocket;

	/**
	 * 定义一些中间变量使用
	 */
	let _model = 'IR';
	let _receive_ready = false
	let _debug = false
	let isRestSize = true;
	let _display_box = false



	/**
	 * 在普通模式下需要发送的验证数据
	 */
	let send_msg =
		'{"wink_count":0,"wink_count_success":0,"mouth_count":0,"mouth_count_success":0,"head_count":0,"head_count_success":0}'


	/**
	 * 自定义标签
	 */
	let face_tag;
	let _close_stream = [];


	/**
	 * 返回结果
	 */
	let result = {
		'success': false,
		'pass': false,
		'name': ''
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
		_initSysInfo();
		if (io !== undefined) {
			let _url = url + '/notice';
			noticeSocket = io(_url, {
				autoConnect: false
			});
		}
		if (!_debug) {
			_send_canvas.hide()
		}
		_display_box = face_tag.attr('display-box') === 'true'
		if (_display_box) {
			face_tag.append(_box_canvas);
		}
		face_tag.append(_scr_data_v);
		face_tag.append(_display_v);
		face_tag.append(_send_canvas);
		if (isMac) {
			face_tag.append(_display_v_iphone)
		}
		_init_webcam();
	}


	/**
	 * 初始化页面需要的canvas和video标签
	 */
	function _init_table() {
		//用于发送验证图片
		_send_canvas = $('<canvas/>');
		_send_canvas.attr('width', _def_config['width'])
		_send_canvas.attr('height', _def_config['height'])
		_send_canvas.attr('id', 'send-canvas')
		//用于显示人脸位置
		_box_canvas = $('<canvas/>');
		_box_canvas.attr('width', _def_config['width'])
		_box_canvas.attr('height', _def_config['height'])
		_box_canvas.attr('id', 'box-canvas')
		_box_canvas.css('z-index',999)
		_box_context = _box_canvas[0].getContext('2d')
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
		if (isMac) {
			_display_v_iphone = document.createElement('video')
			_display_v_iphone.setAttribute('id', 'RGB_iPhone');
			_display_v_iphone.setAttribute('autoplay', '');
			_display_v_iphone.setAttribute('playsinline', '');
		}

	}

	function _initSysInfo() {
		if (matchBS.indexOf('mac') !== -1) {
			isMac = true;
		} else if (matchBS.indexOf('windows') !== -1) {
			isWin = true;
		} else if (matchBS.indexOf('android') !== -1) {
			isAndroid = true;
		} else {
			unKnow = true;
		}
		_init_table();
	}



	/**
	 * 初始化摄像头
	 */
	function _init_webcam() {
		if (isMac) {
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
					devices.forEach(device => {
						if (device.kind === 'videoinput' && device.label.indexOf('前置') !== -1) {
							initStream(device.label, device.deviceId, _display_v_iphone)
						}
					});
				})
			}).catch(error => {
				_error_msg.text('Not support userMedia')
			})
		} else {
			if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices()) {
				navigator.mediaDevices.enumerateDevices().then(function(devices) {
					devices.forEach(device => {
						if (device.kind === 'videoinput') {
							if (device.label.indexOf('IR') !== -1) {
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
		if (deviceLabel.indexOf('back') !== -1) {
			return;
		}
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
				_error_msg.text('Not support userMedia')
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
				_error_msg.text('Not support userMedia')
				console.log('Not support userMedia')
			});
		}
	}

	/**
	 * 发送验证图片
	 */
	function _send_img() {
		const _send_context = _send_canvas[0].getContext('2d');
		let _stream_src;
		if (_model === 'IR') {
			_stream_src = _scr_data_v[0]
		} else {
			if (isMac) {
				_stream_src = _display_v_iphone
			} else {
				_stream_src = _display_v[0]
			}
		}
		_stream_src.addEventListener('timeupdate', event => {
			if(isRestSize){
				resetCanvasSize(_stream_src)
			}
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
	 * 根据当前视频窗口的大小重置canvas标签的大小
	 * @param {Object} _video
	 */
	function resetCanvasSize(_video) {
		video_w = _video.videoWidth;
		video_h = _video.videoHeight;
		_send_canvas.attr('width', video_w)
		_send_canvas.attr('height', video_h)
		if (_display_box) {
			_box_canvas.attr('width', video_w)
			_box_canvas.attr('height', video_h)
		}
		isRestSize = false;
	}

	function _draw_face_box(location) {
	    let face = {};
	    face.x = parseInt(location['left'])
		face.y = parseInt(location['top'])
		face.width = parseInt(location['bottom']) - parseInt(location['top'])
		face.height = parseInt(location['right']) - parseInt(location['left'])
		face.name = location['name']
		_box_canvas.attr('width', video_w)
		_box_canvas.attr('height', video_h)
	    _box_context.strokeStyle = '#a64ceb';
	    _box_context.strokeRect(face.x, face.y, face.width, face.height);
	    _box_context.font = '11px Helvetica';
	    _box_context.fillStyle = "#fff";
	    _box_context.fillText(face.name, face.x + face.width / 2, face.y + face.height + 11);
    };

	/**
	 * 接收服务端信息
	 */
	function _receive() {
		if (noticeSocket.connected) {
			_receive_ready = true
			noticeSocket.on('server', req => {
				console.log(req)
				let reqdata = JSON.parse(req.data);
				if (_display_box) {
				    _draw_face_box(reqdata[0]['location'])
				}
				if (reqdata[0]['pass'] || reqdata[0]['pass'] === 'true') {
					result['pass'] = true;
					result['success'] = true;
					result['name'] = reqdata[0]['location']['name']
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
