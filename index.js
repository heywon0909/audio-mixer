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
   
      const volumeControl = document.getElementById("volume");
      volumeControl.addEventListener("input", function () {
        gainNode.gain.value = this.value;
      });
    
    const pannerOptions = { pan: 0 };
    const panner = new StereoPannerNode(context, pannerOptions);
    // 스테레오 패닝
    
      const pannerControl = document.getElementById("panner");
      pannerControl.addEventListener("input", function () {
        panner.pan.value = this.value;
      });
    
    
      let oscillatorNode = null;

      document
        .getElementById("oscillator_control")
        .addEventListener("click", function () {
          if (this.dataset.osPlaying === "true") {
            oscillatorNode.stop();
            this.dataset.osPlaying = "false";
          } else {
            oscillatorNode = context.createOscillator();
            oscillatorNode.connect(context.destination);
            oscillatorNode.type = `${
              document.querySelector("[name=os_control]:checked")?.id
            }`;
            oscillatorNode.start();
            this.dataset.osPlaying = "true";
          }
        });

      document
        .getElementById("control_frequency")
        .addEventListener("input", function (event) {
          oscillatorNode.frequency.value = event.target.value;
        });
    
    const distortion = context.createWaveShaper();
    document.getElementById('distortion').addEventListener('input', function () {
      let val = parseInt(this.value* 500);
      distortion.curve = makeDistortionCurve(val);
      distortion.oversample = '4x';
      source.connect(distortion);
      distortion.connect(context.destination)
    })

    const biquadFilter = context.createBiquadFilter();
    document.getElementById('filter').addEventListener('input', function () {
      biquadFilter.type = "lowshelf";
      biquadFilter.frequency.value = this.value;
      biquadFilter.gain.setValueAtTime(25, context.currentTime);
      source.connect(biquadFilter);
      biquadFilter.connect(context.destination);
    })

    const convolver = context.createConvolver();
    
  

    let playBut = document.getElementById("play");
    playBut.addEventListener(
      "click",
      function () {
        if (this.dataset.playing == "true") {
          this.dataset.playing = false;
          context.suspend();
        } else {
          this.dataset.playing = true;
          context.resume();
        }
      },
      false
    );
    source.connect(gainNode).connect(panner).connect(context.destination);
    setAudioVisualization(source, context);
  });
}

function setAudioVisualization(source, context) {
  console.log("source", source);
  const analyser = context.createAnalyser();
  source.connect(analyser);
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

 function makeDistortionCurve(amount) {
    let k = typeof amount === "number" ? amount : 50,
      n_samples = 44100,
      curve = new Float32Array(n_samples),
      deg = Math.PI / 180,
      i = 0,
      x;
    for (; i < n_samples; ++i) {
      x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
