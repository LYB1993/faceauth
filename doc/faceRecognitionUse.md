页面中使用`<face-div>`标签来创建识别区域
```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<title>模块化引入</title>
	</head>
	<body>
		<div>
			<face-div display-box="false"></face-div>
		</div>
	</body>
	<script src="../static/js/jquery.min.js"></script>
	<script src="https://cdn.bootcss.com/socket.io/2.2.0/socket.io.js"></script>
	<script src="../static/js/face.js"></script>
	<script>
		$(document).ready(function() {
			$.face('https://127.0.0.1:5001', {
				model: 'GEN',
				success: function(result) {
					console.log(result)
				}
			})
		})
	</script>
</html>
```
## html页面引入 face.js文件，在需要使用识别的地方执行
```javascript
$.face('https://127.0.0.1:5001', {
	width: '640px',
	height:'480px'
	debug: false,
	success: function(result) {
		console.log(result)
	}
})
```
可配置参数有：
1. width: 设置识别区域的宽度
2. height: 设置识别区域的高度
3. debug: 设置是否启用debug模式
4. success：设置验证通过后的回调方法

- 使用 
1. 可以先访问`https://127.0.0.1:5001/upload`页面上传需要识别面部图片，并标注身份证号码（唯一标识，姓名也可以）
2. 然后就可以访问`https://127.0.0.1:5001/model`页面进行识别，识别成功后会显示 设别到的面部信息的 身份证号码或者名称
3. 可以通过访问`https://127.0.0.1:5001/settings`设置识别模式，识别度等信息

- ps

目前已测试可使用Chrome iPhone 6s 以及部分Android 机型
