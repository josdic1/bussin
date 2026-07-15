import { AccessCodeGate } from "../../auth/AccessCodeGate";
import { DriverTripControls } from "./components/DriverTripControls";
import { CurrentTime } from "../parent/components/CurrentTime";

export function DriverPage() {
  return (
    <AccessCodeGate
      pageClassName="driverPage"
      eyebrow="BUSSIN · DRIVER"
      title="Share the trip."
      instructions="Enter the driver access code. You only need to enter it once on this device."
      authorizedMessage="Driver access is confirmed."
      fieldLabel="Driver access code"
      submitLabel="Open driver controls"
      storageKey="bussin.driverAccessCode"
      endpoint="/api/access/driver"
      headerName="x-driver-code"
      headerExtra={<CurrentTime />}
    >
      <DriverTripControls />
    </AccessCodeGate>
  );
}
