#!/usr/bin/env bash
# Zet de eigen domeinen van Studio Sedillo aan op GitHub Pages.
#
#   tools/eigen-domein.sh check   # staan de DNS-records goed? (verandert niets)
#   tools/eigen-domein.sh site    # studiosedillo.com            -> repo studio-sedillo
#   tools/eigen-domein.sh test    # test-sudokukids.…            -> repo sudoku-kids-test
#   tools/eigen-domein.sh live    # sudokukids.studiosedillo.com -> repo sudoku-kids-live
#   tools/eigen-domein.sh https   # HTTPS afdwingen op alle drie (kan pas als het certificaat er is)
#
# Draai eerst `check`. Zonder goede DNS stuurt GitHub bezoekers van het oude
# github.io-adres naar een domein dat niet bestaat. Uitleg: docs/studio-sedillo.md.
set -euo pipefail

USER_GH="jmldewaal-sedillo"
APEX="studiosedillo.com"
LIVE_HOST="sudokukids.$APEX"
TEST_HOST="test-sudokukids.$APEX"
SOURCE_REPO="$USER_GH/sudoku-kids"
PAGES_IPS="185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153"

ok=1
say() { printf '%s\n' "$*"; }
good() { say "  goed       $*"; }
bad() { say "  ONTBREEKT  $*"; ok=0; }

check_cname() {   # host
  local got
  got="$(dig +short CNAME "$1" | tr 'A-Z' 'a-z')"
  if [ "$got" = "$USER_GH.github.io." ]; then good "CNAME $1 -> $got"; else bad "CNAME $1 -> $USER_GH.github.io. (nu: ${got:-niets})"; fi
}

check() {
  say "DNS van $APEX"
  local a
  a="$(dig +short A "$APEX" | sort | tr '\n' ' ')"
  for ip in $PAGES_IPS; do
    case " $a " in *" $ip "*) good "A @ $ip" ;; *) bad "A @ $ip" ;; esac
  done
  for ip in $a; do
    case " $PAGES_IPS " in *" $ip "*) ;; *) bad "A @ $ip hoort er niet (meer) te staan: verwijder dit record" ;; esac
  done
  if [ "$(dig +short AAAA "$APEX" | grep -c '^2606:50c0:800[0-3]::153$')" = 4 ]; then good "AAAA @ (4 adressen)"; else bad "AAAA @ 2606:50c0:8000::153 t/m 8003::153"; fi
  check_cname "www.$APEX"
  check_cname "$LIVE_HOST"
  check_cname "$TEST_HOST"
  if dig +short TXT "_github-pages-challenge-$USER_GH.$APEX" | grep -q .; then good "TXT _github-pages-challenge-$USER_GH (domeinverificatie)"; else bad "TXT _github-pages-challenge-$USER_GH (domeinverificatie, zie docs/studio-sedillo.md)"; fi
  if dig +short MX "$APEX" | grep -q .; then good "MX (e-mail doorsturen)"; else bad "MX (e-mail doorsturen via Namecheap)"; fi
  if [ "$ok" = 1 ]; then say "Alles staat goed."; else say "Nog niet alles staat goed. DNS-wijzigingen kunnen tot 24 uur duren."; fi
}

need_dns() {
  check
  if [ "$ok" != 1 ]; then say "Gestopt: eerst DNS in orde maken."; exit 1; fi
}

set_domain() {   # repo host
  gh api -X PUT "repos/$1/pages" -f cname="$2" >/dev/null
  say "Eigen domein van $1 staat op $2."
}

case "${1:-}" in
  check)
    check
    [ "$ok" = 1 ]
    ;;
  site)
    need_dns
    ( cd "$(dirname "$0")/../../../studio-sedillo" && printf '%s\n' "$APEX" > CNAME && git add CNAME && git commit -q -m "Eigen domein: $APEX" && git push -q )
    set_domain "$USER_GH/studio-sedillo" "$APEX"
    ;;
  test)
    need_dns
    # De testdeploy schrijft het CNAME-bestand zodra deze variabele bestaat.
    gh variable set TEST_DOMAIN -R "$SOURCE_REPO" -b "$TEST_HOST"
    set_domain "$USER_GH/sudoku-kids-test" "$TEST_HOST"
    say "Push nu opnieuw naar branch test, zodat het CNAME-bestand in de testkopie komt."
    ;;
  live)
    need_dns
    # De repository en de deploy key maak je zelf één keer aan (docs/studio-sedillo.md,
    # "De live-repository klaarzetten"); dit script maakt geen sleutels.
    if ! gh repo view "$USER_GH/sudoku-kids-live" >/dev/null 2>&1; then
      say "De repository sudoku-kids-live bestaat nog niet. Zie docs/studio-sedillo.md, 'De live-repository klaarzetten'."
      exit 1
    fi
    # De livedeploy draait pas (en schrijft het CNAME-bestand) zodra deze variabele bestaat.
    gh variable set LIVE_DOMAIN -R "$SOURCE_REPO" -b "$LIVE_HOST"
    say "Variabele LIVE_DOMAIN gezet. De eerstvolgende push naar main vult sudoku-kids-live."
    if gh api "repos/$USER_GH/sudoku-kids-live/pages" >/dev/null 2>&1; then
      set_domain "$USER_GH/sudoku-kids-live" "$LIVE_HOST"
    else
      say "Zet daarna GitHub Pages aan op sudoku-kids-live (branch main) en draai dit commando nog een keer."
    fi
    ;;
  https)
    for repo in studio-sedillo sudoku-kids-test sudoku-kids-live; do
      if gh api -X PUT "repos/$USER_GH/$repo/pages" -F https_enforced=true >/dev/null 2>&1; then say "HTTPS afgedwongen: $repo"; else say "Nog niet mogelijk voor $repo (certificaat nog niet klaar of repo bestaat niet); probeer het later opnieuw."; fi
    done
    ;;
  *)
    sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
