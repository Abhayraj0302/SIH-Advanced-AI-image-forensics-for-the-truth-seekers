import PortalFieldCollection from "@/components/ui/portal-field";

export default function PortalFieldDemo() {
  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      <PortalFieldCollection
        speed={1}
        size={1}
        length={1}
        density={1}
        opacity={1}
        hue={0}
        saturation={1}
        brightness={1}
      />
    </div>
  );
}
