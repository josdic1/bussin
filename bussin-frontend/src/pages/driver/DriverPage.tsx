import { AccessCodeGate } from "../../auth/AccessCodeGate";
import { IosInstallGate } from "../../components/IosInstallGate";
import { DriverTripControls } from "./components/DriverTripControls";
import { CurrentTime } from "../parent/components/CurrentTime";

export function DriverPage() {
  return (
    <IosInstallGate
      appName="Bussin Driver"
      storageKey="bussin.driverInstallGateSeenV2"
      allowBrowserUse
    >
      <AccessCodeGate
        pageClassName="driverPage"
        eyebrow={
          <>
            <span className="parentBrandWord">BUSSIN</span>
            <span className="parentBrandDot">•</span>
            <span className="parentBrandAudience">DRIVER</span>
          </>
        }
        title="Share the trip."
        instructions="Enter the driver access code. You only need to enter it once on this device."
        authorizedMessage="Driver access is confirmed."
        fieldLabel="Driver access code"
        submitLabel="Open driver controls"
        storageKey="bussin.driverAccessCode"
        endpoint="/api/access/driver"
        headerName="x-driver-code"
        headerExtra={
          <span className="driverHeaderExtra">
            <CurrentTime />
            <img src="/icon-bus-acid.svg" alt="" />
          </span>
        }
      >
        <DriverTripControls />
      </AccessCodeGate>
    </IosInstallGate>
  );
}
