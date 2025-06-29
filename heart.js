window.requestAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function (callback) {
    setTimeout(callback, 1000 / 60);
  };

window.isDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
  (navigator.userAgent || navigator.vendor || window.opera).toLowerCase()
);

var loaded = false;

var init = function () {
  if (loaded) return;
  loaded = true;

  var mobile = window.isDevice;
  var koef = mobile ? 0.5 : 1;
  var canvas = document.getElementById("heart");
  var ctx = canvas.getContext("2d");
  var width = (canvas.width = koef * innerWidth);
  var height = (canvas.height = koef * innerHeight);
  var rand = Math.random;

  var pointer = { x: -9999, y: -9999 };
  var repulsionRadius = 100;
  var repulsionForce = 200;

  // Event listeners
  canvas.addEventListener("mousemove", function (e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (e.clientX - rect.left) * koef;
    pointer.y = (e.clientY - rect.top) * koef;
  });
  canvas.addEventListener("mouseleave", function () {
    pointer.x = -9999;
    pointer.y = -9999;
  });
  canvas.addEventListener("touchmove", function (e) {
    const touch = e.touches[0];
    if (touch) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (touch.clientX - rect.left) * koef;
      pointer.y = (touch.clientY - rect.top) * koef;
    }
  }, { passive: true });
  canvas.addEventListener("touchend", function () {
    pointer.x = -9999;
    pointer.y = -9999;
  });

  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0, 0, width, height);

  var heartPosition = function (rad) {
    return [
      Math.pow(Math.sin(rad), 3),
      -(
        15 * Math.cos(rad) -
        5 * Math.cos(2 * rad) -
        2 * Math.cos(3 * rad) -
        Math.cos(4 * rad)
      )
    ];
  };

  var scaleAndTranslate = function (pos, sx, sy, dx, dy) {
    return [dx + pos[0] * sx, dy + pos[1] * sy];
  };

  window.addEventListener("resize", function () {
    width = canvas.width = koef * innerWidth;
    height = canvas.height = koef * innerHeight;
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, width, height);
  });

  var traceCount = mobile ? 20 : 50;
  var pointsOrigin = [];
  var dr = mobile ? 0.3 : 0.1;
  for (var i = 0; i < Math.PI * 2; i += dr)
    pointsOrigin.push(scaleAndTranslate(heartPosition(i), 310, 19, 0, 0));
  for (var i = 0; i < Math.PI * 2; i += dr)
    pointsOrigin.push(scaleAndTranslate(heartPosition(i), 250, 15, 0, 0));
  for (var i = 0; i < Math.PI * 2; i += dr)
    pointsOrigin.push(scaleAndTranslate(heartPosition(i), 190, 11, 0, 0));

  var heartPointsCount = pointsOrigin.length;
  var targetPoints = [];

  var pulse = function (kx, ky) {
    for (var i = 0; i < pointsOrigin.length; i++) {
      targetPoints[i] = [
        kx * pointsOrigin[i][0] + width / 2,
        ky * pointsOrigin[i][1] + height / 2.2,
      ];
    }
  };

  var e = [];
  for (var i = 0; i < heartPointsCount; i++) {
    var x = rand() * width;
    var y = rand() * height;
    e[i] = {
      vx: 0,
      vy: 0,
      R: 2,
      speed: rand() + 5,
      q: ~~(rand() * heartPointsCount),
      D: 2 * (i % 2) - 1,
      force: 0.2 * rand() + 0.7,
      f: "rgba(51, 204, 255, 0.7)",
      trace: Array.from({ length: traceCount }, () => ({ x, y })),
    };
  }

  var config = { traceK: 0.4, timeDelta: 0.6 };
  var time = 0;

  var loop = function () {
    var n = -Math.cos(time);
    pulse((1 + n) * 0.5, (1 + n) * 0.5);
    time += (Math.sin(time) < 0 ? 9 : n > 0.8 ? 0.2 : 1) * config.timeDelta;

    ctx.fillStyle = "rgba(0,0,0,.1)";
    ctx.fillRect(0, 0, width, height);

    for (var i = e.length; i--;) {
      var u = e[i];
      var q = targetPoints[u.q];
      var dx = u.trace[0].x - q[0];
      var dy = u.trace[0].y - q[1];
      var length = Math.sqrt(dx * dx + dy * dy);

      if (length < 10) {
        if (rand() > 0.95) {
          u.q = ~~(rand() * heartPointsCount);
        } else {
          if (rand() > 0.99) u.D *= -1;
          u.q = (u.q + u.D) % heartPointsCount;
          if (u.q < 0) u.q += heartPointsCount;
        }
      }

      // Gaya ke target
      u.vx += (-dx / length) * u.speed;
      u.vy += (-dy / length) * u.speed;

      // Gaya tolak dari pointer
      var dx2 = u.trace[0].x - pointer.x;
      var dy2 = u.trace[0].y - pointer.y;
      var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (dist2 < repulsionRadius) {
        var repulsion = (1 - dist2 / repulsionRadius) * repulsionForce;
        u.vx += (dx2 / dist2) * repulsion;
        u.vy += (dy2 / dist2) * repulsion;
      }

      u.trace[0].x += u.vx;
      u.trace[0].y += u.vy;
      u.vx *= u.force;
      u.vy *= u.force;

      for (var k = 0; k < u.trace.length - 1; k++) {
        var T = u.trace[k];
        var N = u.trace[k + 1];
        N.x -= config.traceK * (N.x - T.x);
        N.y -= config.traceK * (N.y - T.y);
      }

      ctx.fillStyle = u.f;
      u.trace.forEach((t) => ctx.fillRect(t.x, t.y, 1, 1));
    }

    window.requestAnimationFrame(loop, canvas);
  };

  loop();
};

var s = document.readyState;
if (s === "complete" || s === "loaded" || s === "interactive") init();
else document.addEventListener("DOMContentLoaded", init);
