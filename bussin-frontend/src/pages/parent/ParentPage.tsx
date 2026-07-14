import { AccessCodeGate } from "../../auth/AccessCodeGate";

export function ParentPage() {
  return (
    <AccessCodeGate
      eyebrow="BUSSIN · PARENTS"
      title="Know when to leave."
      instructions="Enter the parent access code provided by the camp. You only need to enter it once on this device."
      authorizedMessage="Parent access is confirmed. The live bus map and alerts will appear here next."
      fieldLabel="Parent access code"
      submitLabel="Open bus tracker"
      storageKey="bussin.parentAccessCode"
      endpoint="/api/access/parent"
      headerName="x-parent-code"
    />
  );
}
