import React from 'react'
import { IconButton, Typography } from '@material-ui/core'
import FlatList from '../../lists/FlatList'
import { Shift } from './sharedUtils'
import { UserAvatar } from '../../util/avatars'
import { Delete } from '@material-ui/icons'
import { useUserInfo } from '../../util/useUserInfo'
import { DateTime, Interval } from 'luxon'
import { useURLParam } from '../../actions'
import { relativeDate } from '../../util/timeFormat'

type FixedSchedShiftsListProps = {
  value: Shift[]
  onRemove: (shift: Shift) => void

  start: string
  end: string
}

export default function FixedSchedShiftsList({
  start,
  end,
  value,
  onRemove,
}: FixedSchedShiftsListProps) {
  const _shifts = useUserInfo(value)
  const [zone] = useURLParam('tz', 'local')

  function items() {
    let shifts = _shifts.map((s) => ({
      shift: s,
      added: false,
      start: DateTime.fromISO(s.start, { zone }),
      end: DateTime.fromISO(s.end, { zone }),
      interval: Interval.fromDateTimes(
        DateTime.fromISO(s.start, { zone }),
        DateTime.fromISO(s.end, { zone }),
      ),
    }))
    if (!shifts.length) return []
    const displaySpan = Interval.fromDateTimes(
      DateTime.fromISO(start, { zone }).startOf('day'),
      DateTime.fromISO(end, { zone }).startOf('day'),
    )

    const result: any = []
    displaySpan.splitBy({ days: 1 }).forEach((day) => {
      const dayShifts = shifts.filter((s) => day.overlaps(s.interval))
      if (!dayShifts.length) return
      result.push({
        subHeader: relativeDate(day.start),
      })
      dayShifts.forEach((s) => {
        let shiftDetails = ''
        const startTime = s.start.toLocaleString({
          hour: 'numeric',
          minute: 'numeric',
        })
        const endTime = s.end.toLocaleString({
          hour: 'numeric',
          minute: 'numeric',
        })
        if (s.interval.engulfs(day)) {
          // shift (s.interval) spans all day
          shiftDetails = 'All day'
        } else if (day.engulfs(s.interval)) {
          // shift is inside the day
          shiftDetails = `From ${startTime} to ${endTime}`
        } else if (day.contains(s.end)) {
          shiftDetails = `Active until ${endTime}`
        } else {
          // shift starts and continues on for the rest of the day
          shiftDetails = `Active after ${startTime}`
        }
        result.push({
          title: s.shift.user.name,
          subText: shiftDetails,
          icon: <UserAvatar userID={s.shift.userID} />,
          secondaryAction: s.added ? null : (
            <IconButton onClick={() => onRemove(s.shift)}>
              <Delete />
            </IconButton>
          ),
        })
        s.added = true
      })
    })

    return result
  }

  return (
    <React.Fragment>
      <Typography variant='subtitle1' component='h3'>
        Shifts
      </Typography>
      <FlatList
        items={items()}
        emptyMessage='Add a user to the left to get started.'
        dense
        ListItemProps={{
          disableGutters: true,
          divider: true,
        }}
      />
    </React.Fragment>
  )
}