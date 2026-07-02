"use client";
import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";


export default function Calcom({className}: {className?: string}) {
    useEffect(() => {
        (async function () {
            const cal = await getCalApi({ "namespace": "20min" });
            cal("ui", { "hideEventTypeDetails": false, "layout": "month_view" });
        })();
    }, [])
    return (<button
        data-cal-namespace="20min"
        data-cal-link="tamale-frank-qkzbty/20min"
        data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
        className={className}
    >
        Book a setup call
    </button>);
};



