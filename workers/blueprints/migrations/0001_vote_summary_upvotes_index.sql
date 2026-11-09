-- Klass has no index declarations, so query indexes are hand-written. Serves the most-favorited listing.
CREATE INDEX `blueprint_vote_summary_idx_number_of_upvotes` ON `blueprint_vote_summary` (`number_of_upvotes`,`key`);
