let currentStream_show;
let currentStream_send;
const noticeSocket = io('http://127.0.0.1:5001/notice');
// const noticeSocket = undefined;
let isStart = false;
const start = document.getElementById('start');
const video_show = document.getElementById('showimage');
const video_ri = document.getElementById('redimage');
const canvas_send = document.getElementById('sendimage')
const context_send = canvas_send.getContext('2d');
const canvas_box = document.getElementById('showfacebox')
const context_box = canvas_box.getContext('2d');
start.addEventListener('click', event => {
	if (isStart) {
		isStart = noticeSocket.disconnected
		noticeSocket.close()
	} else {
		noticeSocket.open()
		isStart = noticeSocket.connected
	}
})




window.addEventListener('load', event => {
	console.log(navigator.mediaDevices.enumerateDevices());
	if (typeof currentStream_send !== 'undefined') {
		stopMediaTracks(currentStream_send);
	}
	if (typeof currentStream_show !== 'undefined') {
		stopMediaTracks(currentStream_show);
	}
	var constraints_send = {
		video: {
			deviceId: {
				exact: '117e485067410fffc0199e7512503aeffef2f795968a7b662c2fb37604cec07b'
			}
		},
		audio: false
	};
	var constraints_show = {
		video: {
			deviceId: {
				exact: 'e28539669af7e82dcba10f767933c1d8dd775e20d6a165533877c5477da2c2b8'
			}
		},
		audio: false
	};
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia(constraints_show)
			.then(stream => {
				currentStream_show = stream;
				video_show.srcObject = stream;
			}).catch(error => {
				console.log('Not support userMedia')
			});
		navigator.mediaDevices.getUserMedia(constraints_send)
			.then(stream => {
				currentStream_send = stream;
				video_ri.srcObject = stream;
			}).catch(error => {
				console.log('Not support userMedia')
			});

	} else if (navigator.getUserMedia) {
		navigator.mediaDevices.getUserMedia(constraints_show)
			.then(stream => {
				currentStream_show = stream;
				video_show.srcObject = stream;
			}).catch(error => {
				console.log('Not support userMedia')
			});
		navigator.getUserMedia(constraints_send, stream => {
			currentStream_send = stream;
			video_ri.srcObject = stream;
		}, err => {
			console.log('Not support userMedia')
		});

	} else {
		console.log('Not support userMedia');
	}
	noticeSocket.on('server', req => {
		console.log(req.data)
		JSON.parse(req.data).forEach(map => {
			let face = {};
			face.x = parseInt(map['left'])
			face.y = parseInt(map['top'])
			face.width = parseInt(map['bottom']) - parseInt(map['top'])
			face.height = parseInt(map['right']) - parseInt(map['left'])
			face.name = map['name']
			draw_face_box(face)
		})
	})
	video_ri.addEventListener('timeupdate', event => {
		canvas_send.setAttribute("width", video_ri.clientWidth);
		canvas_send.setAttribute("height", video_ri.clientHeight);
		canvas_box.setAttribute("width", video_show.clientWidth);
		canvas_box.setAttribute("height", video_show.clientHeight);
		context_send.drawImage(video_ri, 0, 0);
		var base64 = canvas_send.toDataURL('images/png');
		let timestamp = Math.round(new Date() / 1000)
		if (isStart && timestamp % 3 === 0) {
			if (noticeSocket) {
				noticeSocket.emit('unknown_img', {
					data: base64
				})
			}
		}
	})

})

function stopMediaTracks(stream) {
	stream.getTracks().forEach(track => {
		track.stop();
	});
}

function draw_face_box(face) {
	context_box.strokeStyle = '#a64ceb';
	context_box.strokeRect(face.x, face.y, face.width, face.height);
	context_box.font = '11px Helvetica';
	context_box.fillStyle = "#fff";
	context_box.fillText(face.name, face.x + face.width / 2, face.y + face.height + 11);
};
