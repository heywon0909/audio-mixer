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
  let source;
  context.decodeAudioData(file, function (buffer) {
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = false;

    const gainNode = context.createGain();
    gainNode.gain.value = 0.5;
    const pannerOptions = { pan: 0 };
    const panner = new StereoPannerNode(context, pannerOptions);
    const distortion = context.createWaveShaper();
    const biquadFilter = context.createBiquadFilter();
    let musicDelay = context.createDelay(5.0);

    let timerSetting = null;
    setMusicTimeInfo(0.0, buffer.duration.toFixed(2));

    // 사운드 수정하기
    let fast_rate = 1;
    const soundForward = document.getElementById("forward");
    soundForward.addEventListener("click", function () {
      fast_rate += 0.5;
      source.playbackRate.value = fast_rate;
    });

    const soundBackword = document.getElementById("backward");
    soundBackword.addEventListener("click", function () {
      fast_rate -= 0.05;
      source.playbackRate.value = fast_rate;
    });

    const volumeControl = document.getElementById("volume");
    volumeControl.addEventListener("input", function () {
      gainNode.gain.setValueAtTime(this.value, context.currentTime);
      this.nextElementSibling.querySelector("span").textContent = this.value;
      gainNode.connect(context.destination);
      source.connect(gainNode);
    });

    // 스테레오 패닝

    const pannerControl = document.getElementById("panner");
    pannerControl.addEventListener("input", function () {
      panner.pan.value = this.value;
      this.nextElementSibling.querySelector("span").textContent = this.value;
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
        if (oscillatorNode) {
          oscillatorNode.frequency.value = event.target.value;
        }
      });

    document
      .getElementById("distortion")
      .addEventListener("input", function () {
        let val = parseInt(this.value * 500);
        this.nextElementSibling.querySelector("span").textContent = val;
        distortion.curve = makeDistortionCurve(val);
        distortion.oversample = "4x";
      });

    document.getElementById("filter").addEventListener("input", function () {
      biquadFilter.type = "lowshelf";
      biquadFilter.frequency.value = this.value;
      biquadFilter.gain.setValueAtTime(10, context.currentTime);
      this.nextElementSibling.querySelector("span").textContent = this.value;
    });

    document.getElementById("delay").addEventListener("input", function () {
      source.stop();
      musicDelay.delayTime.setValueAtTime(this.value, context.currentTime + 2);
      this.nextElementSibling.querySelector("span").textContent = this.value;
      document.querySelector(".setting-container").style = "display:none";
      if (this.value > 0) {
        source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = false;
        if (fast_rate > 1 && fast_rate < 1) {
          source.playbackRate.value = fast_rate;
        }

        source
          .connect(gainNode)
          .connect(panner)
          .connect(distortion)
          .connect(musicDelay)
          .connect(biquadFilter)
          .connect(context.destination);
        source.start(0);
        setAudioVisualization(source, context);
      }
    });

    let playBut = document.getElementById("play");
    playBut.addEventListener(
      "click",
      function () {
        console.log("this", this.dataset.playing);

        if (this.dataset.playing == "true") {
          this.dataset.playing = false;
          context.suspend();
          clearInterval(timerSetting);
        } else {
          this.dataset.playing = true;
          if (context.state === "suspended") {
            context.resume();
          } else {
            source.start();
          }

          timerSetting = setTimeout(function run() {
            let rate = Math.ceil(source.playbackRate.value);
            let currentTime = context.currentTime.toFixed(2);
            let stopTime = buffer.duration.toFixed(2);
            if (rate > 1 || rate < 1) {
              clearTimeout(timerSetting);
              document.querySelector(".setting-container").style =
                "display:none";
            }
            if (Number(currentTime) <= Number(stopTime)) {
              setMusicTimeInfo(currentTime, stopTime);
              setTimeout(run, 100);
            } else {
              setMusicTimeInfo(currentTime, stopTime);
              clearTimeout(timerSetting);
            }
          }, 100);
        }
      },
      false
    );

    source
      .connect(gainNode)
      .connect(panner)
      .connect(distortion)
      .connect(musicDelay)
      .connect(biquadFilter)
      .connect(context.destination);
    setAudioVisualization(source, context);
  });
}
function printTime(from, to) {
  let current = from;
}
function setMusicTimeInfo(from, to) {
  document.getElementById("currentTime").textContent = getTimeStamp(from);
  document.getElementById("durationTime").textContent = getTimeStamp(to);
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

  let canvas = document.querySelector(".visualizer");
  let canvasCtx = canvas.getContext("2d");

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

  var barWidth = (WIDTH / bufferLength) * 1.5;
  var barHeight;
  var x = 0;

  function draw() {
    let drawVisual = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "rgb(245,245,245)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    x = 0;

    for (var i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i];

      canvasCtx.fillStyle = "rgb(4,81," + (barHeight + 100) + ")";
      canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);

      x += barWidth + 1;
    }
  }
  return draw();
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

function getTimeStamp(time) {
  let hour = parseInt(time / 3600);
  let min = parseInt((time % 3600) / 60);
  let sec = parseInt((time % 3600) % 60);

  return `${hour}:${min < 10 ? `0${min}` : min}:${sec < 10 ? `0${sec}` : sec}`;
}
