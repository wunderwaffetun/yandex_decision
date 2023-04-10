"use strict";
function drawRadius(ctx, station) {
    ctx.beginPath();
    ctx.arc(station.coordinates[0], station.coordinates[1], station.radius, 0, Math.PI * 2, true); // Внешняя окружность
    ctx.stroke();
}
function drawStationCenter(ctx, station) {
    ctx.beginPath();
    ctx.arc(station.coordinates[0], station.coordinates[1], 10, 0, Math.PI * 2, true); // Внешняя окружность
    ctx.fill();
    ctx.stroke();
}
function distance(station, point) {
    return ((station.coordinates[0] - point[0]) ** 2 + (station.coordinates[1] - point[1]) ** 2);
}
function onRing(station, point) {
    if (distance(station, point) <= station.radius ** 2 + 2 &&
        distance(station, point) >= station.radius ** 2 - 2) {
        return true;
    }
    else {
        return false;
    }
}
function tracking(stations, stationIds) {
    const c = document.getElementById("myCanvas");
    const ctx = c.getContext("2d");
    ctx.strokeRect(0, 0, 500, 500);
    stations.forEach(station => {
        drawStationCenter(ctx, station);
        drawRadius(ctx, station);
    });
    let intersectionPoints = [];
    for (let i = 0; i < stations.length; ++i) {
        for (let j = i + 1; j < stations.length; ++j) {
            const [circle, compareCircle] = [stations[i], stations[j]];
            const [x1, y1] = [circle.coordinates[0], circle.coordinates[1]];
            const [x2, y2] = [compareCircle.coordinates[0], compareCircle.coordinates[1]];
            const [dy, dx] = [y2 - y1, x2 - x1];
            const [R1, R2] = [circle.radius, compareCircle.radius];
            const distanceBetweenCenters = Math.hypot(dx, dy);
            const cosAngle = (R1 ** 2 + distanceBetweenCenters ** 2 - R2 ** 2) / (2 * R1 * distanceBetweenCenters); // по Теореме косинусов 
            const angle = Math.acos(cosAngle);
            const deviationAngle = Math.atan2(dy, dx); // Не все центры кругов расположены на 1 прямой, поэтому отклоняю угол
            const [x_first_point, y_first_point] = [
                x1 + Math.cos(deviationAngle - angle) * R1,
                y1 + Math.sin(deviationAngle - angle) * R1
            ];
            const [x_second_point, y_second_point] = [
                x1 + Math.cos(deviationAngle + angle) * R1,
                y1 + Math.sin(deviationAngle + angle) * R1
            ];
            intersectionPoints.push([x_first_point, y_first_point], [x_second_point, y_second_point]);
        }
    }
    stationIds.forEach((visibleArr, index) => {
        const color = `#${index.toString(16).repeat(3)}`;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        let currentPoints = JSON.parse(JSON.stringify(intersectionPoints)); // точки между которыми будет типсон 
        /*
            Задача заключается в том, чтобы выделить наименьшую возможную область: если 2 станции регистрируют робота, а ещё 1 или 2 нет, то нужно выбрать
            точки из пересечения этих областей и отсеять области, в которых сторонние станции не засекли бота
        */
        const noVisibleArrCircles = stations.filter(station => Boolean(!~visibleArr.findIndex(elem => elem === station.id))); // Массив станций, которые не регистрировали пёстрика
        /*
            для 2 зарегистрировавших станций:
                беру все точки пересечения, которые лежат между этими 2 станциями и отбрасываю те, которые лежат ВНУТРИ радиусов действий станций,
                которые не зарегистрировали бота
            для 3 зарегистрировавших станций:
                тут попроще: просто в каждом проходе цикла для зарегистрировавшей станции отсеиваю все точки, которые не в её радиусе действия
        */
        if (visibleArr.length === 2) {
            visibleArr.forEach((circleId) => {
                let circle;
                circle = stations.find(station => station.id === circleId);
                const [x, y] = [circle?.coordinates[0], circle?.coordinates[1]];
                const R = circle?.radius;
                if (x && y && R) {
                    currentPoints = currentPoints.filter((point) => {
                        if (((point[0] - x) ** 2 + (point[1] - y) ** 2) <= R ** 2 + 1) {
                            return point;
                        }
                    });
                }
            });
            noVisibleArrCircles.forEach(circle => {
                const [x, y] = [circle.coordinates[0], circle.coordinates[1]];
                const R = circle.radius;
                currentPoints = currentPoints.filter((point) => {
                    if (((point[0] - x) ** 2 + (point[1] - y) ** 2) >= R ** 2 - 1) {
                        return point;
                    }
                });
            });
        }
        else if (visibleArr.length === 3) {
            visibleArr.forEach(circleId => {
                let circle = stations.find(station => station.id === circleId);
                const [x, y] = [circle?.coordinates[0], circle?.coordinates[1]];
                const R = circle?.radius;
                currentPoints = currentPoints.filter((point) => {
                    if (x && y && R) {
                        if (((point[0] - x) ** 2 + (point[1] - y) ** 2) <= R ** 2 + 1) {
                            return point;
                        }
                    }
                });
            });
        }
        currentPoints.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point[0], point[1], 3, 0, Math.PI * 2, true); // Внешняя окружность
            ctx.fill();
        });
        const partiсipantStations = stations.filter(station => {
            let flag = false;
            currentPoints.forEach((point) => {
                if (distance(station, point) <= station.radius ** 2 + 1) {
                    flag = true;
                }
            });
            return flag;
        });
        ctx.beginPath();
        partiсipantStations.forEach((station, i) => {
            let points = [], centralPoint = [0, 0];
            currentPoints.forEach((point) => {
                if (onRing(station, point)) {
                    points.push(point);
                }
                centralPoint[0] += point[0] / currentPoints.length;
                centralPoint[1] += point[1] / currentPoints.length;
            });
            let stationX = station.coordinates[0], stationY = station.coordinates[1], [x1, y1] = [points[0][0], points[0][1]], [x2, y2] = [points[1][0], points[1][1]], counterclockwise = false, angleFrom = Math.atan2(y2 - stationY, x2 - stationX), // угол от абсциссы до первой точки 
            angleTo = Math.atan2(y1 - stationY, x1 - stationX), // угол от абсциссы до второй точки
            angle = null, r = station.radius;
            //чтобы впоследствии выбрать нужную дугу, о чём написано ниже найду координаты промежуточноый точки, чтобы проверяя её координаты
            // выяснить там или не там отобразась дуга, чтобы впоследствии перерисовать по необходимости
            //чтобы определить какую часть дуги использовать во-первых нужно понимать, 
            //что оба случая будут использоваться: первый случай достигается когда угол между 2 точками < 180deg (меньшая дуга)
            //2 - ой > 180, чтобы найти эту длину дуги и определить какую использовать предлагается:
            //если расстояние между центрами пересекающихся кругов < любого из его радиусов, берётся наибольшая дуга, иначе наименьшая,
            // чтобы определить угол недостаточно вычесть углы друг из друга, нужно правильно расставить знаки: 
            if (angleFrom > 0 && angleTo > 0) {
                angle = (angleTo - angleFrom) * 180 / Math.PI;
            }
            if (angleFrom < 0 && angleTo < 0) {
                angle = Math.abs(angleFrom - angleTo) * 180 / Math.PI;
            }
            else {
                angle = Math.abs(Math.abs(angleFrom) + Math.abs(angleTo)) * 180 / Math.PI;
            }
            let newX = stationX + r * Math.cos((angleTo - angleFrom) / 2 + angleFrom), // это точка между 2 (.) окружности
            newY = stationY + r * Math.sin((angleTo - angleFrom) / 2 + angleFrom);
            let flag = 1;
            if (r ** 2 < (newX - centralPoint[0]) ** 2 + (newY - centralPoint[1]) ** 2) { // это точка между 2 (.) окружности, если отрисовалась c противоположной стороны
                flag = -1; // чтобы правильно построить кривые ограничивающие область 
                newX = stationX + r * -Math.cos((angleTo - angleFrom) / 2 + angleFrom),
                    newY = stationY + r * -Math.sin((angleTo - angleFrom) / 2 + angleFrom);
            }
            const intermediate = [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2];
            const intToAvDistance = Math.sqrt((newX - intermediate[0]) ** 2 + (newY - intermediate[1]) ** 2);
            const newDistance = r + intToAvDistance;
            let strongPointX = stationX + newDistance * flag * Math.cos((angleTo - angleFrom) / 2 + angleFrom), // это точка между 2 (.) окружности
            strongPointY = stationY + newDistance * flag * Math.sin((angleTo - angleFrom) / 2 + angleFrom);
            ctx.arc(centralPoint[0], centralPoint[1], 3, 0, 2 * Math.PI);
            ctx.lineWidth = 4;
            ctx.moveTo(x1, y1); // чтобы не получался сегмент круга, а дуга, перевожу перо в крайнюю точку и лишь потом рисую дугу
            ctx.quadraticCurveTo(strongPointX, strongPointY, x2, y2);
            ctx.stroke();
        });
        ctx.closePath();
        ctx.fill(); // закрашивает только сектора кругов, центральная часть местности остаётся пустой
        ctx.moveTo(...currentPoints.at(-currentPoints.length));
        let newArr = JSON.parse(JSON.stringify(currentPoints)); // Код ниже закрашивает всю осталную часть 
        for (let i = 0; i <= newArr.length / 2; i++) {
            let a = newArr[i];
            newArr[i] = newArr[newArr.length - 1 - i];
            newArr[newArr.length - 1 - i] = a;
        }
        currentPoints.push(newArr);
        for (let i = -currentPoints.length + 1; i < 0; i++) {
            const curPoint = currentPoints.at(i);
            ctx.lineTo(...curPoint);
        }
        ctx.stroke();
        ctx.fill();
    });
}
const stations = [{
        "id": 1,
        "coordinates": [100, 100],
        "radius": 100
    }, {
        "id": 2,
        "coordinates": [350, 120],
        "radius": 180
    }, {
        "id": 3,
        "coordinates": [150, 330],
        "radius": 180
    }, {
        "id": 4,
        "coordinates": [410, 390],
        "radius": 150
    }];
const stationIds = [
    // [1, 2],
    // [2, 3],
    // [3, 4]
    [2, 3, 4]
];
tracking(stations, stationIds);
