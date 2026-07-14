import { AccessCodeGate } from "../../auth/AccessCodeGate";
import { ParentTripStatus } from "./components/ParentTripStatus";

export function ParentPage() {
  return (
    <AccessCodeGate
      eyebrow="BUSSIN · PARENTS"
      title="Know when to leave."
      instructions="Enter the parent access code provided by the camp. You only need to enter it once on this device."
      authorizedMessage="Parent access is confirmed."
      fieldLabel="Parent access code"
      submitLabel="Open bus tracker"
      storageKey="bussin.parentAccessCode"
      endpoint="/api/access/parent"
      headerName="x-parent-code"
    >
      <ParentTripStatus />
    </AccessCodeGate>
  );
}
