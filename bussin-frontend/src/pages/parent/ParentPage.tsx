import { AccessCodeGate } from "../../auth/AccessCodeGate";
import { IosInstallGate } from "../../components/IosInstallGate";
import { ParentTripStatus } from "./components/ParentTripStatus";

export function ParentPage() {
  return (
    <AccessCodeGate
      pageClassName="parentPage"
      eyebrow={
        <>
          <span className="parentBrandWord">BUSSIN</span>
          <span className="parentBrandDot">•</span>
          <span className="parentBrandAudience">PARENTS</span>
        </>
      }
      title="Know when to leave."
      instructions="Enter the parent access code provided by the camp. You only need to enter it once on this device."
      authorizedMessage="Parent access is confirmed."
      fieldLabel="Parent access code"
      submitLabel="Open bus tracker"
      storageKey="bussin.parentAccessCode"
      endpoint="/api/access/parent"
      headerName="x-parent-code"
      headerExtra={
        <span className="parentHeaderBus" aria-hidden="true">
          <img src="/icon-bus-acid.svg" alt="" />
        </span>
      }
    >
      <IosInstallGate
        appName="Bussin"
        storageKey="bussin.parentInstallGateSeen"
      >
        <ParentTripStatus />
      </IosInstallGate>
    </AccessCodeGate>
  );
}
