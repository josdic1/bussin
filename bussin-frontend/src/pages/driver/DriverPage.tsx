import { AccessCodeGate } from "../../auth/AccessCodeGate";

export function DriverPage() {
  return (
    <AccessCodeGate
      pageClassName="driverPage"
      eyebrow="BUSSIN · DRIVER"
      title="Share the trip."
      instructions="Enter the driver access code. You only need to enter it once on this device."
      authorizedMessage="Driver access is confirmed. Trip sharing and driver controls will appear here next."
      fieldLabel="Driver access code"
      submitLabel="Open driver controls"
      storageKey="bussin.driverAccessCode"
      endpoint="/api/access/driver"
      headerName="x-driver-code"
    />
  );
}
