CREATE TABLE IF NOT EXISTS `users` (
  `user` varchar(15) NOT NULL,
  `password` binary(40) NOT NULL,
  `sessionid` varchar(25) NOT NULL,
  `ip` varchar(40) NOT NULL,
  `last_used` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `userlevel` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `users_challenges` (
  `username` varchar(15) NOT NULL,
  `challenger` varchar(15) NOT NULL,
  `gamekey` int(11) NOT NULL,
  `status` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;