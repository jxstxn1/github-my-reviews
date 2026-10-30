export class DomHighlighter {
  private readonly badgeClass = "ghmr-badge";
  private readonly rowClass = "ghmr-review-needed";

  private getRow(link: HTMLAnchorElement): HTMLElement | null {
    return (
      link.closest<HTMLElement>(
        ['[data-testid="issue-row"]', ".Box-row", "article", "li"].join(","),
      ) ?? link.parentElement
    );
  }

  highlight(link: HTMLAnchorElement): void {
    const row = this.getRow(link);

    if (!row) {
      return;
    }

    row.classList.add(this.rowClass);

    if (row.querySelector(`.${this.badgeClass}`)) {
      return;
    }

    const badge = document.createElement("span");

    badge.className = this.badgeClass;
    badge.textContent = "Review needed";
    badge.title = "Your review has been requested on this PR.";

    link.appendChild(badge);
  }

  clear(link: HTMLAnchorElement): void {
    const row = this.getRow(link);

    row?.classList.remove(this.rowClass);
    row?.querySelector(`.${this.badgeClass}`)?.remove();
  }
}
