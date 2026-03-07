import axios from "axios";

const CONTROLPLANE_BASE = "http://api.raven.slabs.pt";

export async function SendMail({outboxId, from, fromName, subject, text, html, cc, bcc, to}) {
    if (!outboxId || !from || !fromName || !subject || (!text && !html) || (cc && !Array.isArray(cc)) || (bcc && !Array.isArray(bcc)) || (to && !Array.isArray(to))) {
        throw new TypeError("SendMail: Missing required fields. Check the documentation for the correct format.");
    }

    try {
        await axios.post(`http://${CONTROLPLANE_BASE}/sendMail`, {
            outboxId,
            from,
            fromName,
            subject,
            text,
            html,
            cc,
            bcc,
            to
        },
        {
            headers: {
                Authorization: "Bearer " + process.env.STS_CODE
            },
            timeout: 10000
        });

        return {
            success: true
        };
    } catch (err) {
        console.error(`SendMail(${outboxId}) failed:`, err?.message || err);
        throw err;
    }
}