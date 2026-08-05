export default interface ILog {
    sequence : number,
    timestamp : string,
    data : string[],
    loglevel : 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG',
    owneruuid : string
}
