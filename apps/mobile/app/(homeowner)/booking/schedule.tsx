// The schedule step was removed in the booking-flow redesign (2026-06-24).
// Timing preference is now captured via the preferred-window chips in service-select.
// Any deep-link or stale reference to this route is safely redirected.
import { Redirect } from 'expo-router';

export default function ScheduleStep() {
  return <Redirect href="/(homeowner)/booking/service-select" />;
}
