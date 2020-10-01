import React, { useState, useEffect, ReactNode } from 'react'
import { useMutation } from 'react-apollo'
import gql from 'graphql-tag'
import { fieldErrors } from '../../util/errutil'
import FormDialog from '../../dialogs/FormDialog'
import { Shift, Value } from './sharedUtils'
import _ from 'lodash-es'
import { FormContainer } from '../../forms'
import { bindKeyboard, virtualize } from 'react-swipeable-views-utils'
import SwipeableViews from 'react-swipeable-views'
import AddShiftsStep from './AddShiftsStep'
import ScheduleTimesStep from './ScheduleTimesStep'
// allows changing the index programatically
const VirtualizeAnimatedViews = bindKeyboard(virtualize(SwipeableViews))

const mutation = gql`
  mutation($input: SetScheduleShiftsInput!) {
    setScheduleShifts(input: $input)
  }
`

type FixedScheduleDialogProps = {
  onClose: () => void
  scheduleID: string
  value?: Value
}

export default function FixedScheduleDialog({
  onClose,
  scheduleID,
  value: _value,
}: FixedScheduleDialogProps): JSX.Element {
  const edit = Boolean(_value)

  const [step, setStep] = useState(edit ? 1 : 0) // edit starting on step 2
  const [value, setValue] = useState({
    start: _value?.start ?? '',
    end: _value?.end ?? '',
    shifts: (_value?.shifts ?? []).map((s) =>
      _.pick(s, 'start', 'end', 'userID'),
    ),
  })

  const [submit, { loading, error, data }] = useMutation(mutation, {
    onCompleted: () => onClose(),
    variables: {
      input: {
        ...value,
        scheduleID,
      },
    },
  })

  const fieldErrs = error ? fieldErrors(error) : []
  const stepOneErrs = fieldErrs.some((e) => ['start', 'end'].includes(e.field))

  // array.fill fn?
  const stepTwoErrs = fieldErrs.some((e) =>
    ['summary', 'details'].includes(e.field),
  )

  useEffect(() => {
    if (stepOneErrs) setStep(0)
    else if (stepTwoErrs) setStep(1)
  }, [stepOneErrs, stepTwoErrs])

  const isComplete = data && !loading && !error

  type SlideRenderer = {
    index: number
    key: number
  }
  function renderSlide({ index, key }: SlideRenderer): ReactNode {
    switch (index) {
      case 0:
        return (
          <ScheduleTimesStep
            key={key}
            stepText='STEP 1 OF 2'
            scheduleID={scheduleID}
          />
        )
      case 1:
        return (
          <AddShiftsStep
            key={key}
            value={value.shifts}
            onChange={(shifts: Shift[]) => setValue({ ...value, shifts })}
            stepText={edit ? '' : 'STEP 2 OF 2'}
            scheduleID={scheduleID}
            start={value.start}
            end={value.end}
          />
        )
      default:
        return null
    }
  }

  function getPrimaryActionDisabled() {
    switch (step) {
      case 0:
        return !value.start || !value.end
      case 1:
        return !value.shifts?.length ?? false
      default:
        return false
    }
  }

  return (
    <FormDialog
      fullScreen
      disableGutters
      title='Define a Fixed Schedule'
      primaryActionLabel={isComplete ? 'Done' : null}
      onClose={onClose}
      loading={loading}
      form={
        <FormContainer
          optionalLabels
          disabled={loading}
          value={value}
          onChange={(newValue: Value) => setValue(newValue)}
          errors={fieldErrs}
        >
          <VirtualizeAnimatedViews
            index={step}
            onChangeIndex={(i: number) => setStep(i)}
            slideRenderer={renderSlide}
            disabled // disables slides from changing outside of action buttons
            containerStyle={{ height: '100%' }}
            style={{ height: '100%' }}
          />
        </FormContainer>
      }
      primaryActionDisabled={getPrimaryActionDisabled()}
      onSubmit={() => (isComplete ? onClose() : submit())}
      onNext={step === 1 ? null : () => setStep(step + 1)}
      onBack={(edit ? step === 1 : step === 0) ? null : () => setStep(step - 1)}
    />
  )
}