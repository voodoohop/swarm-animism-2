import { all } from 'ramda'
import {Filter, Meter} from "tone";

import { midiToFrequency } from '../utils'

const SMOOTHING = 0.94

export function getSmoothingFunctor(smoothing = 0.9, startValue = null) {
    let smoothedValue = startValue

    return newValue => {
      if (!isFinite(newValue) || isNaN(newValue)) {
          return smoothedValue
      }

      if (smoothedValue === null) {
        smoothedValue = newValue
      } else {
        smoothedValue = smoothing * smoothedValue + (1 - smoothing) * newValue
      }

      return smoothedValue
    }
}

export default function createBandpassNoteTracker(midiNotes, inputNode) {

  const filterMeters = midiNotes.map(key => {
    const filter = new Filter({
      frequency: midiToFrequency(key),
      type: 'bandpass',
      rolloff: -48,
      Q: 20,
      gain: 0,
    })

    const meter = new Meter()

    inputNode.connect(filter)
    filter.connect(meter)

    return meter
  }).map(meter => {
    const smoother = getSmoothingFunctor(SMOOTHING)
    return () => smoother(meter.getValue())
  })

  const overallInputMeter = new Meter()
  const inputMeterSmoother = getSmoothingFunctor(SMOOTHING)

  const smoothedOverallInputMeter = () => {
    return inputMeterSmoother(overallInputMeter.getValue())
  }

  inputNode.connect(overallInputMeter)
  let previousChordTriggered = false

  // const smooth = (previousValue, value, smoothing = 0.9) => previousValue * smoothing + (1-smoothing) * value

  function updateFunction() {
    const filterMeterValues = filterMeters.map(meter => meter())
    const overallInputLevel  = smoothedOverallInputMeter()
    // console.log(overallInputLevel)
    if (overallInputLevel === null) {
      return false
    }

    const normalizedFilterMeterValues = filterMeterValues.map(level => {
      return level - overallInputLevel
    })

    // console.log(normalizedFilterMeterValues, overallInputLevel)

    const chordTriggered = (
      all(level => level > -40, normalizedFilterMeterValues) &&
      overallInputLevel > -30
    )

    const newChordTriggered = !previousChordTriggered && chordTriggered
    previousChordTriggered = chordTriggered

    return newChordTriggered
  }

  return updateFunction
}
