export default async function timezones(req: ReqType, res: ResType) {
    let timezones = []
    for (let timezone of req.adminizer.config.timezones) {
        timezones.push({
            value: timezone.id,
            label: timezone.name
        })
    }
    return res.json({timezones: timezones})

}
