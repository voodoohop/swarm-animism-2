import {Frequency} from "tone";


export function midiToFrequency(midi) {
  return new Frequency(midi,"midi").toFrequency();
}


export function randomRange(min, max) {
  return (Math.random() * (max - min)) + min
}

export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function frequencyToMidi(frequency) {
  return frequencyToMidi(frequency)
}

export function isAudioSupported() {
  return window.AudioContext || window.webkitAudioContext
}

export function isUserMediaSupported() {
  return window.navigator.mediaDevices && window.navigator.mediaDevices.getUserMedia
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

export function getQueryVariable(variable) {
  const query = window.location.search.substring(1)
  const vars = query.split('&')

  for (let i = 0; i < vars.length; i++) {
    const pair = vars[i].split('=')

    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1])
    }
  }

  return null
}

export function debug(...args) {
  if (getQueryVariable('debug')) {
    console.log(...args)
  }
}
