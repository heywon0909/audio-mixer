const inputElem = document.getElementById("input");
inputElem.addEventListener("change", function (e) {
  let files = e.target.files;
  readFile(files, this);
});

// audio 파일 읽어오기
function readFile(files, target) {
  let fileReader = new FileReader();
  fileReader.readAsArrayBuffer(files[0]);
  fileReader.onload = function (e) {
    let label = target.parentElement.querySelector(".label");
    label.textContent = files[0].name;
    label.dataset.jsLabel = true;
    setAudioFile(e.target.result);
  };
}

function setAudioFile(file) {
  let context = new window.AudioContext();
  context.decodeAudioData(file, function (buffer) {
    let source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = false;
    source.connect(context.destination);
    source.start(0);
    // 사운드 수정하기
    const gainNode = context.createGain();
    function controlAudioVolume(source, context) {
      const volumeControl = document.getElementById("volume");
      volumeControl.addEventListener("input", function () {
        gainNode.gain.value = this.value;
      });
    }
    const pannerOptions = { pan: 0 };
    const panner = new StereoPannerNode(context, pannerOptions);
    // 스테레오 패닝
    function controlStereoPanning(source, context) {
      const pannerControl = document.getElementById("panner");
      pannerControl.addEventListener("input", function () {
        panner.pan.value = this.value;
      });
    }

    setAudioVisualization(source, context);
    controlStereoPanning(source, context);
    controlAudioVolume(source, context);
    source.connect(gainNode).connect(panner).connect(context.destination);

    let playBut = document.getElementById("play");
    playBut.addEventListener("click", function () {
      if (this.dataset.playing == "true") {
        this.dataset.playing = false;
        context.suspend();
      } else {
        this.dataset.playing = true;
        context.resume();
      }
    });
  });
}

function setAudioVisualization(source, context) {
  const analyser = context.createAnalyser();
  source.connect(analyser);
  const distortion = context.createWaveShaper();
  source.connect(context.destination);

  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  var canvas = document.querySelector(".visualizer");
  var canvasCtx = canvas.getContext("2d");

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

  function draw() {
    let drawVisual = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "white";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "red";
    canvasCtx.beginPath();

    var sliceWidth = (WIDTH * 1.0) / bufferLength;
    var x = 0;

    for (var i = 0; i < bufferLength; i++) {
      var v = dataArray[i] / 128.0;
      var y = (v * HEIGHT) / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
  draw();
}
