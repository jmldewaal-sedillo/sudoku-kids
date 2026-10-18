#!/usr/bin/env bash
# Zet het eigen domein van de HOOFDSITE aan op GitHub Pages.
#
#   tools/eigen-domein.sh check   # staan de DNS-records goed? (verandert niets)
#   tools/eigen-domein.sh site    # studiosedillo.com -> repo studio-sedillo
#   tools/eigen-domein.sh https   # HTTPS afdwingen (kan pas als het certificaat er is)
#
# Alleen de hoofdsite krijgt een eigen domein. Apps hebben (nog) geen eigen website: ze
# verschijnen als Android-app en op webportals, en hun privacy- en verwijderpagina staan op
# studiosedillo.com/<app>/. Uitleg: docs/lanceren.md en docs/studio-sedillo.md.
set -euo pipefail

USER_GH="jmldewaal-sedillo"
APEX="studiosedillo.com"
PAGES_IPS="185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153"

ok=1
say() { printf '%s\n' "$*"; }
good() { say "  goed       $*"; }
bad() { say "  ONTBREEKT  $*"; ok=0; }

check() {
  say "DNS van $APEX"
  local a got
  a="$(dig @1.1.1.1 +short A "$APEX" | sort | tr '\n' ' ')"
  for ip in $PAGES_IPS; do
    case " $a " in *" $ip "*) good "A @ $ip" ;; *) bad "A @ $ip" ;; esac
  done
  for ip in $a; do
    case " $PAGES_IPS " in *" $ip "*) ;; *) bad "A @ $ip hoort er niet (meer) te staan: verwijder dit record" ;; esac
  done
  if [ "$(dig @1.1.1.1 +short AAAA "$APEX" | grep -c '^2606:50c0:800[0-3]::153$')" = 4 ]; then good "AAAA @ (4 adressen)"; else bad "AAAA @ 2606:50c0:8000::153 t/m 8003::153"; fi
  got="$(dig @1.1.1.1 +short CNAME "www.$APEX" | tr 'A-Z' 'a-z')"
  if [ "$got" = "$USER_GH.github.io." ]; then good "CNAME www -> $got"; else bad "CNAME www -> $USER_GH.github.io. (nu: ${got:-niets})"; fi
  if dig @1.1.1.1 +short TXT "_github-pages-challenge-$USER_GH.$APEX" | grep -q .; then good "TXT _github-pages-challenge-$USER_GH (domeinverificatie)"; else bad "TXT _github-pages-challenge-$USER_GH (domeinverificatie, zie docs/studio-sedillo.md)"; fi
  # Subdomeinen van apps horen er niet te zijn: een record naar GitHub zonder site erachter kan gekaapt worden.
  for host in sudokukids test-sudokukids proefapp test-proefapp; do
    if dig @1.1.1.1 +short "$host.$APEX" | grep -q .; then say "  WEGHALEN   record $host (wijst naar GitHub, maar er hoort geen site meer bij)"; ok=0; fi
  done
  if [ "$ok" = 1 ]; then say "Alles staat goed."; else say "Nog niet alles staat goed. DNS-wijzigingen kunnen tot 24 uur duren."; fi
}

case "${1:-}" in
  check)
    check
    [ "$ok" = 1 ]
    ;;
  site)
    check
    if [ "$ok" != 1 ]; then say "Gestopt: eerst DNS in orde maken."; exit 1; fi
    ( cd "$(dirname "$0")/../../../studio-sedillo" && printf '%s\n' "$APEX" > CNAME && git add CNAME && git commit -q -m "Eigen domein: $APEX" && git push -q )
    gh api -X PUT "repos/$USER_GH/studio-sedillo/pages" -f cname="$APEX" >/dev/null
    say "Eigen domein van $USER_GH/studio-sedillo staat op $APEX."
    ;;
  https)
    if gh api -X PUT "repos/$USER_GH/studio-sedillo/pages" -F https_enforced=true >/dev/null 2>&1; then say "HTTPS afgedwongen: studio-sedillo"; else say "Nog niet mogelijk (certificaat nog niet klaar); probeer het later opnieuw."; fi
    ;;
  *)
    sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
