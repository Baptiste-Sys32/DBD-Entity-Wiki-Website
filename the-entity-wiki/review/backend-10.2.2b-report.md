# Backend tuning 10.2.2b

Approved November 20, 2026. Official source is recorded in backend-10.2.2b.json.

Executioner Punishment segment interval corrected from 0.001 to 0.015 seconds. Existing 16 m range and other 10.2.2a buffs retained. Good Guy mechanics now explicitly include 0.8 second pallet Scamper during Slice and Dice, as well as vaults. The existing guide already used 0.8 seconds for both.

Client version remains 10.2.2. No release bump, PTB import, new roster data or artwork changes.

Catalog discovery returned zero additions. Description discovery rejected six unresolved source templates without writing. The catalog/perk API misses backend basekit tuning. New read-only official Steam announcement discovery now participates in sync-all-updates and found both 10.2.2a and 10.2.2b. It searches only the latest 100 announcements, emits full candidate text and requires manual review; keyword matches can include recap articles and are not automatically promoted.

Eight focused tests passed. Required website gates run before publication. Android is unchanged in this site-only follow-up; cross-repo parity will consequently report the intentional mechanics drift until a data port is requested.
