import React, { Component, CSSProperties } from 'react'
import PropTypes from 'prop-types'

type MeterColor = {
    stop: number,
    color: CSSProperties['color'],
};

export type AudioSpectrumProps = {
    id: string,
    width: number,
    height: number,
    audioId: string,
    audioEle: HTMLAudioElement,
    capColor?: CSSProperties['color'],
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
        {stop: 0, color: '#f00'},
        {stop: 0.5, color: '#0CD7FD'},
        {stop: 1, color: 'red'}
    ],
    gap: 10, // gap between meters
}

class AudioSpectrum extends Component<AudioSpectrumProps> {
    static defaultProps = defaultProps;

    private animationId?: number;
    private audioContext?: AudioContext;
    private audioEle?: HTMLAudioElement;
    private audioCanvas?: HTMLCanvasElement;
    private playStatus?: PlayStatus;
    canvasId = this.props.id || this.getRandomId(50)
    private mediaEleSource?: MediaElementAudioSourceNode;
    private analyser?: AnalyserNode ;
    canvasRef = React.createRef<HTMLCanvasElement>();

    getRandomId(len:number) {
        let str = '1234567890-qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'
        let strLen = str.length
        let res = ''
        for (let i = 0; i < len; i++) {
            let randomIndex = Math.floor((Math.random() * strLen))
            res += str[randomIndex]
        }
        return res
    }
    componentDidMount() {
        this.prepareElements()
        this.initAudioEvents()
    }
    initAudioEvents = () => {
        let audioEle = this.audioEle
        if (audioEle) {
            audioEle.onpause = (e) => {
                this.playStatus = 'PAUSED'
            }
            audioEle.onplay = (e) => {
                this.playStatus = 'PLAYING'
                this.prepareAPIs()
                let analyser = this.setupAudioNode(this.audioEle)
                this.drawSpectrum(analyser)
            }
        }
    }
    drawSpectrum = (analyser: AnalyserNode) => {
        let cwidth = this.audioCanvas!.width
        let cheight = this.audioCanvas!.height - this.props.capHeight
        let capYPositionArray: number[] = [] // store the vertical position of hte caps for the preivous frame
        let ctx = this.audioCanvas!.getContext('2d')!;
        let gradient = ctx.createLinearGradient(0, 0, 0, 300);

        if (this.props.meterColor.constructor === Array) {
            let stops = this.props.meterColor
            let len = stops.length
            for (let i = 0; i < len; i++) {
                gradient.addColorStop(stops[i]['stop'], stops[i]['color'] as string)
            }
            } else if (typeof this.props.meterColor === 'string') {
                // gradient = this.props.meterColor 
            }

            let drawMeter = () => {
            let array = new Uint8Array(analyser.frequencyBinCount); // item value of array: 0 - 255
            analyser.getByteFrequencyData(array);
            if (this.playStatus === 'PAUSED') {
                for (let i = array.length - 1; i >= 0; i--) {
                    array[i] = 0
                }
                let allCapsReachBottom = !capYPositionArray.some(cap => cap > 0)
                if (allCapsReachBottom) {
                    ctx.clearRect(0, 0, cwidth, cheight + this.props.capHeight)
                    cancelAnimationFrame(this.animationId!) // since the sound is top and animation finished, stop the requestAnimation to prevent potential memory leak,THIS IS VERY IMPORTANT!
                    return
                }
            }
            let step = Math.round(array.length / this.props.meterCount) // sample limited data from the total array
            ctx.clearRect(0, 0, cwidth, cheight + this.props.capHeight)
            for (let i = 0; i < this.props.meterCount; i++) {
                let value = array[i * step]
                if (capYPositionArray.length < Math.round(this.props.meterCount)) {
                    capYPositionArray.push(value)
                };
                ctx.fillStyle = this.props.capColor!
                // draw the cap, with transition effect
                if (value < capYPositionArray[i]) {
                    // let y = cheight - (--capYPositionArray[i])
                    let preValue = --capYPositionArray[i]
                    let y = (270 - preValue) * cheight / 270
                    ctx.fillRect(i * (this.props.meterWidth + this.props.gap), y, this.props.meterWidth, this.props.capHeight)
                } else {
                    // let y = cheight - value
                    let y = (270 - value) * cheight / 270
                    ctx.fillRect(i * (this.props.meterWidth + this.props.gap), y, this.props.meterWidth, this.props.capHeight)
                    capYPositionArray[i] = value
                };
                ctx.fillStyle = gradient; // set the filllStyle to gradient for a better look

                // let y = cheight - value + this.props.capHeight
                let y = (270 - value) * (cheight) / 270 + this.props.capHeight
                ctx.fillRect(i * (this.props.meterWidth + this.props.gap), y, this.props.meterWidth, cheight) // the meter
            }
            this.animationId = requestAnimationFrame(drawMeter)
        }
        this.animationId = requestAnimationFrame(drawMeter)
    }
    setupAudioNode = (audioEle?: HTMLAudioElement) => {
        if (!audioEle) {
            throw new Error('Audio element is not found')
            
        }
        if (!this.analyser) {
            this.analyser = this.audioContext!.createAnalyser()
            this.analyser.smoothingTimeConstant = 0.8
            this.analyser.fftSize = 2048
        }
        
        if (!this.mediaEleSource) {
            this.mediaEleSource = this.audioContext!.createMediaElementSource(audioEle)
            this.mediaEleSource.connect(this.analyser)
            this.mediaEleSource.connect(this.audioContext!.destination);
        }

        return this.analyser
    }
    prepareElements = () => {
        let { audioId, audioEle } = this.props
        if (!audioId && !audioEle) {
            console.log('target audio not found!');
            return
        } else if (audioId) {
            this.audioEle = document.getElementById(audioId) as HTMLAudioElement;
        } else {
            this.audioEle = audioEle
        }
        
        this.audioCanvas = this.canvasRef.current!;
    }
    prepareAPIs = () => {
        // fix browser vender for AudioContext and requestAnimationFrame
        window.AudioContext = window.AudioContext;
        // window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        window.requestAnimationFrame = window.requestAnimationFrame;
        // window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame;
        // window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
        try {
            this.audioContext = new window.AudioContext(); // 1.set audioContext
        } catch (e) {
            // console.error('!Your browser does not support AudioContext')
            console.log(e);
        }
    }
    render() {
        return (
            <canvas ref={this.canvasRef} id={this.canvasId} width={this.props.width} height={this.props.height}></canvas>
        )
    }
}

export default AudioSpectrum
