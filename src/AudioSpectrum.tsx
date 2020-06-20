import React, {
  CSSProperties, useRef, useEffect,
} from 'react';

type MeterColor = {
  stop: number,
  color: CSSProperties['color'],
};

export type AudioSpectrumProps = {
  id: string,
  width: number,
  height: number,
  audioId?: string,
  audioEle?: HTMLAudioElement,
  capColor: CSSProperties['color'],
  capHeight: number,
  meterWidth: number,
  meterCount: number,
  meterColor: string | MeterColor[],
  gap: number,
};

type PlayStatus = 'PAUSED' | 'PLAYING';

const defaultProps = {
  width: 300,
  height: 200,
  capColor: '#FFF',
  capHeight: 2,
  meterWidth: 2,
  meterCount: 40 * (2 + 2),
  meterColor: [
    { stop: 0, color: '#f00' },
    { stop: 0.5, color: '#0CD7FD' },
    { stop: 1, color: 'red' },
  ],
  gap: 10, // gap between meters
};

function getRandomId(len: number) {
  const str = '1234567890-qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';

  return Array.from({ length: len })
    .reduce((acc: string) => acc.concat(
      str[Math.floor((Math.random() * str.length))],
    ), '');
}

export default function AudioSpectrum({
  width = defaultProps.width,
  height = defaultProps.height,
  capColor = defaultProps.capColor,
  capHeight = defaultProps.capHeight,
  meterWidth = defaultProps.meterWidth,
  meterCount = defaultProps.meterCount,
  meterColor = defaultProps.meterColor,
  gap = defaultProps.gap,
  id = getRandomId(50),
  audioEle: propsAudioEl,
  audioId,
  ...restProps
}: AudioSpectrumProps) {
  let animationId: number;
  let audioContext: AudioContext;
  let audioCanvas: HTMLCanvasElement;
  let playStatus: PlayStatus;
  const canvasId = id;
  let mediaEleSource: MediaElementAudioSourceNode;
  let analyser: AnalyserNode;
  let audioEle: HTMLAudioElement;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const prepareElements = () => {
    if (!audioId && !propsAudioEl) {
      console.error('target audio not found!');
      return;
    }
    if (audioId) {
      audioEle = document.getElementById(audioId) as HTMLAudioElement;
    } else if (propsAudioEl) {
      audioEle = propsAudioEl;
    }
    audioCanvas = canvasRef.current!;
  };

  const drawSpectrum = (currentAnalyser: AnalyserNode) => {
    const cWidth = audioCanvas!.width;
    const cHeight = audioCanvas!.height - capHeight;
    // store the vertical position of hte caps for the previous frame
    const capYPositionArray: number[] = [];
    const ctx = audioCanvas!.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);

    if (Array.isArray(meterColor)) {
      const stops = meterColor;
      stops.forEach((stop) => {
        gradient.addColorStop(stop.stop, stop.color as string);
      });
    } else if (typeof meterColor === 'string') {
      // gradient = this.props.meterColor
    }

    const drawMeter = () => {
      // item value of array: 0 - 255
      const array = new Uint8Array(currentAnalyser.frequencyBinCount);
      currentAnalyser.getByteFrequencyData(array);
      if (playStatus === 'PAUSED') {
        // for (let i = array.length - 1; i >= 0; i--) {
        //   array[i] = 0;
        // }
        array.fill(0);
        const allCapsReachBottom = !capYPositionArray.some((cap) => cap > 0);
        if (allCapsReachBottom) {
          ctx.clearRect(0, 0, cWidth, cHeight + capHeight);
          // since the sound is top and animation finished,
          // stop the requestAnimation to prevent potential memory leak,THIS IS VERY IMPORTANT!
          cancelAnimationFrame(animationId);
          return;
        }
      }
      // sample limited data from the total array
      const step = Math.round(array.length / meterCount);
      ctx.clearRect(0, 0, cWidth, cHeight + capHeight);
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < meterCount; i++) {
        const value = array[i * step];
        if (capYPositionArray.length < Math.round(meterCount)) {
          capYPositionArray.push(value);
        }
        ctx.fillStyle = capColor;
        // draw the cap, with transition effect
        if (value < capYPositionArray[i]) {
          // let y = cHeight - (--capYPositionArray[i])
          // eslint-disable-next-line no-plusplus
          const preValue = --capYPositionArray[i];
          const y = ((270 - preValue) * cHeight) / 270;
          ctx.fillRect(i * (meterWidth + gap), y, meterWidth, capHeight);
        } else {
          // let y = cHeight - value
          const y = ((270 - value) * cHeight) / 270;
          ctx.fillRect(i * (meterWidth + gap), y, meterWidth, capHeight);
          capYPositionArray[i] = value;
        }
        ctx.fillStyle = gradient; // set the fillStyle to gradient for a better look

        // let y = cHeight - value + this.props.capHeight
        const y = ((270 - value) * cHeight) / 270 + capHeight;
        ctx.fillRect(i * (meterWidth + gap), y, meterWidth, cHeight); // the meter
      }
      animationId = requestAnimationFrame(drawMeter);
    };
    animationId = requestAnimationFrame(drawMeter);
  };

  const setupAudioNode = (currentAudioEle?: HTMLAudioElement) => {
    if (!currentAudioEle) {
      throw new Error('Audio element is not found');
    }
    if (!analyser) {
      analyser = audioContext.createAnalyser();
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 2048;
    }

    if (!mediaEleSource) {
      mediaEleSource = audioContext!.createMediaElementSource(currentAudioEle);
      mediaEleSource.connect(analyser);
      mediaEleSource.connect(audioContext!.destination);
    }

    return analyser;
  };

  const prepareAPIs = () => {
    // fix browser vender for AudioContext and requestAnimationFrame
    // window.AudioContext = window.AudioContext;
    // window.AudioContext = window.AudioContext || window.webkitAudioContext
    // || window.mozAudioContext || window.msAudioContext;
    // window.requestAnimationFrame = window.requestAnimationFrame;
    // window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
    // || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
    // window.cancelAnimationFrame = window.cancelAnimationFrame;
    // window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
    try {
      audioContext = new window.AudioContext(); // 1.set audioContext
    } catch (e) {
      console.error('!Your browser does not support AudioContext');
      console.error(e);
    }
  };
  const initAudioEvents = () => {
    if (audioEle) {
      audioEle.onpause = () => {
        playStatus = 'PAUSED';
      };
      audioEle.onplay = () => {
        playStatus = 'PLAYING';
        prepareAPIs();
        const currentAnalyser = setupAudioNode(audioEle);
        drawSpectrum(currentAnalyser);
      };
    }
  };

  useEffect(() => {
    prepareElements();
    initAudioEvents();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id={canvasId}
      width={width}
      height={height}
      {...restProps}
    />
  );
}
