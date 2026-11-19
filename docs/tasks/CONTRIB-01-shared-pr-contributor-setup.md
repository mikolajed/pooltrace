# CONTRIB-01: Shared PR contributor setup

- State: Proposed
- Milestone: Delivery infrastructure, after the DEP-02 CI foundation
- Related ADRs: [Accepted ADR-0009](../adr/0009-pr-verification-and-repository-trust.md)
- Requirement IDs: CR-09, CR-10; [workflow authorization/contribution policy](../WORKFLOW.md#proposed-shared-pr-contributions)
- Depends on: Accepted contribution policy/ADR-0009, explicit setup approval and operational DEP-02
  CI. Final identity/review validation completes the combined workflow with DEP-02.

## Outcome

Independently operated contributor tools can deliver bounded approved tasks through draft PRs
under traceable identities, use the same CI, repair their own failures and hand passing candidates
to the user for review and merge. The setup is reusable across providers without assuming that
every model has a built-in GitHub integration.

## Scope

- Select the first two actual contributor tools with the user. Claude, Codex/GPT and Grok are
  requested examples of the broader direction, not claims of installed clients or native PR support.
  Record exact available tool, account/plan, authentication method and supported delivery actions.
- Prefer separate GitHub App installation identities for independently operated tool connections.
  Confirm authenticated PR author, repository scope, required permissions, token expiry/renewal
  and independent revocation. A shared model runner may use one identity with traceable delivery;
  Git commit display names do not establish PR identity.
- Select each supported adapter/connection against current official documentation and actual
  account access. Keep app keys and long-lived credentials outside arbitrary task/PR-code execution;
  use an approved connection or protected delivery path for short-lived scoped credentials.
  Native user-attributed PR creation must be labeled honestly and cannot satisfy distinct-author
  approval without an explicitly reviewed alternative.
- Make the repository contribution contract available to every enabled tool. Any small tool-specific
  entry file links to canonical rules instead of copying approval/correctness policy. Document a
  reproducible clean cloud setup using existing pins/Bun commands and isolated evidence files.
- Configure permitted task-branch and draft-PR delivery. After the policy is accepted/enabled, a
  task must explicitly include PR delivery to authorize its commits, pushes, PR updates and CI
  fixes. The user retains review/merge; credentials have no protection bypass or administration.
- Demonstrate creation, CI failure/fix, update, readiness and human approval through real identities.
  Enable a second tool against the same checks and prove independent access revocation. Tasks used
  for validation need explicit scope; do not invent product work just to generate PRs.
- Record the enabled identity-to-tool mapping and setup/rotation guidance in the appropriate
  protected account settings or sanitized operational documentation. Keep assignments/scheduling
  in chat, and keep secrets out of repository files, PR bodies, reports and logs.
- After acceptance and successful setup, record the enabled state and replace the current
  user-only commit rule in AGENTS/WORKFLOW with the accepted task-scoped delivery policy together.
  This documentation preparation does not activate that replacement.

## Outside scope

Purchasing provider plans, claiming unverified vendor integration support, a custom multi-provider
dispatcher, automatic task selection, bulk PR creation, automatic review approval/merge, direct
main writes, repository administration beyond approved settings, deployment, M2 features, and
granting a blanket permission to implement the backlog. Initial CI/browser/Linux work is DEP-02.

## Decisions and open questions

Before credential provisioning, select the first tools and inspect real identity/control support.
Native Codex Cloud's PR-author selection has not been verified; installing its connector does not
prove bot-authored delivery. Claude/Grok capability, account access and authentication are also
unverified. A GitHub App is a supported attribution mechanism, not proof a particular vendor can
consume its credentials. Review any required custom delivery adapter separately before building it.

Inspect repository rules and validate which actions the actual contributor credential can perform.
Content/PR write scopes alone do not enforce branch restrictions or human-only merge. Record the
limits of GitHub permissions and the selected control path; do not report a policy instruction as
an enforced capability. Agent-accessible PR code must not gain administrative credentials.

The initial operating proposal is two independent implementation PRs at once. Tool/provider choices
can change without changing correctness criteria or duplicating pipelines. A secondary review tool
may provide findings; the user's review remains required. Further concurrency depends on observed
conflict, CI cost and review capacity, not the number of available models.

## Acceptance criteria

- [ ] ADR-0009 and the proposed delivery policy accepted; specific tools, account actions, costs
  and setup scope explicitly authorized before provisioning.
- [ ] Two selected contributor tools have actual verified authenticated identities, reproducible
  setup and equivalent scoped access; no unverified vendor capability is reported as enabled.
- [ ] Both tools can open/update draft PRs for approved bounded work and trigger DEP-02 checks;
  required runs do not disappear because of automation-token behavior.
- [ ] A failing draft remains unready, a repair reruns current checks, and the actual user can
  approve the distinct PR author and merge after current integration checks.
- [ ] Tool credentials cannot bypass the verified main-branch protection; administration/app keys
  remain outside task/PR-code execution. Any unavoidable enforcement gap is reviewed explicitly.
- [ ] Revoking one tool prevents its subsequent delivery while the other remains usable; token
  expiry/renewal behavior is exercised without leaking credentials.
- [ ] Common instructions and setup/evidence guidance are documented; no automatic task dispatch,
  merge, deployment or broader implementation authority is introduced.

## Planned validation

| Case | Required evidence |
| --- | --- |
| CT01 — identity | Actual PR authenticated author and separate commit metadata; exact tool/connection/account capability and token scopes/lifetime, with no secret output |
| CT02 — delivery | Approved isolated task → task branch → draft PR → actual CI; new commit triggers checks and failed/missing runs prevent review readiness |
| CT03 — review/merge | User approval works for actual author; reviewable updates invalidate old approval; current-base checks pass before user merge |
| CT04 — independence | Second selected provider/tool follows identical checks, rules and setup; neither uses the other's branch or credential |
| CT05 — revocation | Expired/revoked credential fails delivery, independent connection remains functional, protected resources and logs retain no leaked keys |
| CT06 — scope/control | Main/bypass/admin restrictions and authorized delivery actions verified safely; task text/PR content cannot grant broader permission or expose protected credentials |

These are planned checks. A documentation example, installed connector, synthetic API reply or
green PR from the wrong identity cannot establish the actual onboarding result.

## Approval record

- Documentation preparation: Approved on 2026-11-18 by “i want to document this so we can set this up”,
  after “i mean i want many agets to contribute possilby like claude gpt grok etc”.
- Design: ADR-0009 accepted on 2026-11-18. Standing delivery-policy activation and this task's
  setup remain pending; see the proposed WORKFLOW section.
- Implementation/setup approval: Not granted.
- Apps, credentials, cloud/provider accounts, subscriptions, external messages/PRs and remote
  settings: Not authorized by this documentation request.

## Preparation evidence and handoff

Prepared on 2026-11-18 from the requested workflow and read-only repository/source inspection.
ADR-0009 records official GitHub authentication, event and approval references. No provider/account
capability or live identity was tested. `git diff --check` and the 164-target/anchor check across
11 changed/new documents passed. Policy review kept contributor rules in WORKFLOW, technical
gates in ADR-0009 and actual tool/identity capability unresolved until verified. No provider,
browser, application or hosted-CI test ran for this documentation-only work.

No app, credential, cloud environment, adapter, implementation, test PR, commit or push was created.
Next proposed action: after CI scope/design review, select the first two tools and approve their
specific setup. Keep this task Proposed until that authorization is recorded.
