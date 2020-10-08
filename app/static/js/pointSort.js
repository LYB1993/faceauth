/**
 * 
 * @param {array} points 坐标点数据
 */
function pointSort(points) {
	let min = 360;
	let max = 0;
	let mini, maxi = 0;
	for (let index = 0; index < points.length; index++) {
		const element = points[index];
		const latitude = element['latitude'];
		if (latitude > max) {
			max = latitude;
			maxi = index;
		}
		if (latitude < min) {
			min = latitude;
			mini = index;
		}
	}
	let up_array = [];
	let bottom_array = [];
	for (let index = 0; index < points.length; index++) {
		const element = points[index];
		if (element['longitude'] > points[maxi]['longitude']) {
			up_array.push(element)
		} else {
			bottom_array.push(element)
		}
	}
	up_array.sort(compareAsc)
	bottom_array.sort(compareDesc)
	let final_array = [];
	final_array = up_array.concat(bottom_array)
	return final_array;
}

function compareAsc(val1, val2) {
	return val1['latitude'] - val2['latitude'];
}

function compareDesc(val1, val2) {
	return val2['latitude'] - val1['latitude'];
}


/**
 * 判断ponit 是否在points组成的多边形的范围内
 * 
 * @param {Object} point 位置点
 * @param {Array} points 多个位置点组成的多边L形
 */
function isPtInPoly(longitude,latitude, points) {
	if (points.length < 3) return false;
	let nCross = 0;
	for (let index = 0; index < points.length; index++) {
		const _point = points[index];
		const _next_point = points[(index + 1) % points.length]
		if (_point['longitude'] == _next_point['longitude']) continue;
		if (longitude < (_point['longitude'] > _next_point['longitude'] ? _next_point['longitude'] : _point[
				'longitude'])) continue;
		if (longitude >= (_point['longitude'] > _next_point['longitude'] ? _point['longitude'] : _next_point[
				'longitude'])) continue;

		let H = longitude - _point['longitude']
		let M = _next_point['latitude'] - _point['latitude']
		let N = _next_point['longitude'] - _point['longitude']
		let X = _point['latitude']
		let x = H * M / N + X
		if (x > latitude) {
			nCross++;
		}
	}
	return nCross % 2 == 1
}
