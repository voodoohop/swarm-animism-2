import { a as aWeighting } from 'a-weighting'

import { randomRange, debug } from '../utils'
// import bandpassChordDetector from '../behaviours/bandpassPolyTracker'
import {Frequency, Gain, Synth, Filter, Meter, LFO} from "tone";
const defaultOptions = {
  filterQ: 0.75,
  filterRange: 7,
  filterRolloff: -24,
  minInitialNote: 60,
  maxInitialNote: 82,
  minLFOFrequency: 0.1,
  maxLFOFrequency: 0.75,
  minVelocity: 0.001,
  maxVelocity: 0.005,
  velocityRange: 1,
  minVolume: 0.25,
  maxVolume: 0.5,
  triggerChord: [60, 67],
}

export default class FlockingAgent {
  constructor(options = {}, visuals, gainNode) {
    this.visuals = visuals
    this.options = Object.assign({}, defaultOptions, options)

    // Synthesized sound of our agent (output)
    this.synth = new Synth({
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 1,
        release: 1,
      },
    })

    this.synthGainNode = new Gain()
    this.synthGainNode.toDestination()

    this.synth.connect(this.synthGainNode)

    // Filters to analyse the signal at two poles around the center
    this.filterLeft = new Filter({
      frequency: 440,
      type: 'bandpass',
      rolloff: this.options.filterRolloff,
      Q: this.options.filterQ,
      gain: 0,
    })

    this.filterRight = new Filter({
      frequency: 440,
      type: 'bandpass',
      rolloff: this.options.filterRolloff,
      Q: this.options.filterQ,
      gain: 0,
    })

    this.meterLeft = new Meter()
    this.meterRight = new Meter()

    gainNode.connect(this.filterLeft)
    gainNode.connect(this.filterRight)

    this.filterLeft.connect(this.meterLeft)
    this.filterRight.connect(this.meterRight)

    // Choose some random parameters
    this.newRandomNote()

    // LFO for controlling the synth gain
    const lfoFrequency = randomRange(
      this.options.minLFOFrequency,
      this.options.maxLFOFrequency
    )

    this.gainLFO = new LFO(
      lfoFrequency,
      this.options.minVolume,
      this.options.maxVolume
    )

    this.gainLFO.connect(this.synthGainNode.gain)

    // this.bandpassChordDetector = bandpassChordDetector(
    //   this.options.triggerChord,
    //   gainNode
    // )

    this.interval = null
  }

  newRandomNote() {
    this.velocity = randomRange(
      this.options.minVelocity,
      this.options.maxVelocity
    )

    this.initialNote = randomRange(
      this.options.minInitialNote,
      this.options.maxInitialNote
    )

    this.currentNote = this.initialNote
    this.currentVelocity = this.velocity

    // Set the filter poles to initial positions
    this.setFilterPoles(this.initialNote)
  }

  start() {
    this.newRandomNote()

    // The synthesizer play all the time, trigger its note
    this.synth.triggerAttack(
      midiToFrequency(this.initialNote)
    )

    // Start the LFO
    this.gainLFO.start()

    // Change screen color
    this.interval = setInterval(() => {
      const nextFrequency = midiToFrequency(this.currentNote)
      this.visuals.setToColor([
        0, 0, 105 + (Math.round(nextFrequency) % 150)
      ])
    }, 1000)
  }

  stop() {
    this.synth.triggerRelease()

    // Stop the LFO
    this.gainLFO.stop()

    // Remove overlay
    this.visuals.resetColor()

    clearInterval(this.interval)
  }

  setFilterPoles(centerNote) {
    const { filterRange } = this.options

    const left = midiToFrequency(centerNote - filterRange)
    const right = midiToFrequency(centerNote + filterRange)

    this.filterLeft.frequency.setValueAtTime(left, '+0')
    this.filterRight.frequency.setValueAtTime(right, '+0')
  }

  update() {
    // Generate random frequency when chord was detected
    // if (this.bandpassChordDetector()) {
    //   this.newRandomNote()
    //   this.visuals.flash()
    // }

    // Get meter and frequency values of our filter poles
    const leftMeterValue = this.meterLeft.getValue()
    const rightMeterValue = this.meterRight.getValue()
    const leftFilterFreq = this.filterLeft.frequency.value
    const rightFilterFreq = this.filterRight.frequency.value

    // Make all frequencies equally loud
    const weightedLeftMeterValue = aWeighting(leftFilterFreq) * leftMeterValue
    const weightedRightMeterValue = aWeighting(rightFilterFreq) * rightMeterValue

    if (!(isFinite(rightMeterValue) && isFinite(leftMeterValue))) {
      return
    }

    // Velocity is depended on distance to the target frequency
    this.currentVelocity = Math.min(
      Math.max(
        (rightMeterValue - leftMeterValue) * this.velocity,
        -this.options.velocityRange
      ),
      this.options.velocityRange
    )

    // Update the frequencies
    this.currentNote += this.currentVelocity
    this.setFilterPoles(this.currentNote)

    // Change the synth note
    const nextFrequency = midiToFrequency(this.currentNote)
    this.synth.setNote(nextFrequency)

    // Debug output
    debug('=========')
    debug(leftMeterValue, rightMeterValue, this.currentVelocity)
    debug(nextFrequency)
  }
}
