#!/usr/bin/env bash
# A live status sheet for Text Backdrop: the date, uptime, load, memory, the
# fullest disks, the battery and network addresses, in ANSI colour.
#
#   status.sh                  print the sheet once
#   status.sh --watch FILE     rewrite FILE every 30 seconds
#
# --watch writes to a temporary file and renames it over FILE. The rename is
# atomic, so the desktop never redraws from a half-written sheet.
set -euo pipefail

INTERVAL=30
LABEL_WIDTH=10

reset=$'\e[0m' bold=$'\e[1m' dim=$'\e[90m' white=$'\e[97m'
cyan=$'\e[96m' green=$'\e[92m' yellow=$'\e[93m' red=$'\e[91m'

repeat() {
    local out='' i
    for ((i = 0; i < $2; i++)); do out+=$1; done
    printf '%s' "$out"
}

# A 20-cell bar for a percentage, turning yellow then red as it fills. Line
# glyphs, not blocks, so bars on neighbouring rows don't run together.
bar() {
    local pct=$1 width=20 filled colour=$green
    filled=$((pct * width / 100))
    ((pct >= 70)) && colour=$yellow
    ((pct >= 90)) && colour=$red
    printf '%s%s%s%s%s %3d%%' "$colour" "$(repeat ━ "$filled")" "$dim" "$(repeat ─ $((width - filled)))" "$reset" "$pct"
}

row() {
    printf '%s%-*s%s %s\n' "$cyan" "$LABEL_WIDTH" "$1" "$reset" "$2"
}

memory() {
    local total available
    total=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)
    available=$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)
    row Memory "$(bar $(((total - available) * 100 / total))) $dim$(((total - available) / 1048576)) of $((total / 1048576)) GiB$reset"
}

# The four fullest real filesystems; snaps, tmpfs and the like are skipped.
disks() {
    local first=1 use mount
    while read -r use mount; do
        # Long mount points keep their last whole path components.
        if ((${#mount} > 24)); then
            mount=${mount: -22}
            mount="…/${mount#*/}"
        fi
        if ((first)); then
            row Disks "$(bar "${use%\%}") $white$mount$reset"
            first=0
        else
            row '' "$(bar "${use%\%}") $white$mount$reset"
        fi
    done < <(df -P -x tmpfs -x devtmpfs -x squashfs -x overlay -x efivarfs 2>/dev/null |
        awk 'NR > 1 {print $5, $6}' | sort -rn | head -4)
}

# Only the machine's own battery: wireless mice and keyboards also report
# batteries, with their scope set to Device.
battery() {
    local supply
    for supply in /sys/class/power_supply/*; do
        [[ -r $supply/type && $(<"$supply/type") == Battery ]] || continue
        [[ -r $supply/scope && $(<"$supply/scope") == Device ]] && continue
        row Battery "$(bar "$(<"$supply/capacity")") $dim$(<"$supply/status")$reset"
        return
    done
}

network() {
    local first=1 iface addr
    while read -r iface addr; do
        if ((first)); then
            row Network "$white$addr$reset $dim$iface$reset"
            first=0
        else
            row '' "$white$addr$reset $dim$iface$reset"
        fi
    done < <(ip -4 -o addr show scope global | awk '$2 !~ /^(br-|docker|virbr|veth)/ {print $2, $4}' | head -3)
}

sheet() {
    local load cores load_pct
    read -r load _ < /proc/loadavg
    cores=$(nproc)
    load_pct=$(awk -v load="$load" -v cores="$cores" 'BEGIN {p = int(load * 100 / cores); print (p > 100 ? 100 : p)}')
    printf '%s%s%s  %s%s%s\n' "$bold$white" "$(hostname)" "$reset" "$dim" "$(date '+%A %-d %B %Y · %H:%M')" "$reset"
    printf '%s%s%s\n\n' "$dim" "$(repeat ─ 56)" "$reset"
    row Uptime "$white$(uptime -p | sed 's/^up //')$reset"
    row Load "$(bar "$load_pct") $dim$load on $cores cores$reset"
    memory
    disks
    battery
    network
}

case ${1:-} in
'')
    sheet
    ;;
--watch)
    file=${2:?usage: status.sh --watch FILE}
    tmp=''
    trap 'rm -f "$tmp"' EXIT
    while :; do
        tmp=$(mktemp "$file.XXXXXX")
        sheet > "$tmp"
        mv -f "$tmp" "$file"
        sleep "$INTERVAL"
    done
    ;;
*)
    echo 'usage: status.sh [--watch FILE]' >&2
    exit 2
    ;;
esac
