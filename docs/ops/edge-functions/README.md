# Edge function source mirror

These `.ts` files are the **version-controlled source of truth** for the Supabase Edge
Functions deployed to project `zkkingzdbbbriwyxbxkf`. They previously existed only in
Supabase (bus-factor risk); every deployed function is now mirrored here.

**Keep in sync:** whenever a function is changed, deploy it AND update the file here (or
vice-versa). Deploy via the Supabase MCP `deploy_edge_function`, or the CLI:

```
supabase functions deploy <name> --project-ref zkkingzdbbbriwyxbxkf
```

**Note:** `release-escrow` is deployed with `verify_jwt = false` (it does custom
admin-or-service-role auth inline); all others use `verify_jwt = true`.
